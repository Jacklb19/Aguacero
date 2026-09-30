# Case study: where should a computation run?

## 1. Problem and question

Aguacero explores IDEAM climate data from datos.gov.co and asks: should a computation run on
the server, on the page's main thread, in one Web Worker, in a pool of Workers sharing
memory, or inside an in-browser WASM database (DuckDB-Wasm)? At what data size does the
answer change?

## 2. Route-by-route pattern matrix

| Route | Pattern | Why |
| --- | --- | --- |
| `/`, `/methodology`, `/dictionary/[dataset]`, `/results`, `/styleguide` | SSG | Stable content; instant load, crawlable |
| `/datasets`, `/datasets/[id]` | ISR, 3600 s, tags `datasets`, `dataset:<slug>` | Shared by everyone, upstream changes slowly, aggregates are slow (20-60 s) |
| `/my-dashboard` | SSR | Depends on the `ag_region` cookie and must be fresh |
| `/explore`, `/lab` | CSR, cross-origin isolated | Constant interaction, no SEO need, needs `SharedArrayBuffer` |

The contract test (`pnpm test:contract`) reads `.next/prerender-manifest.json` and checks it
against `src/config/routes.ts`. Every footer shows the pattern (`<RenderNote />`).

## 3. Implementation highlights

- **Socrata client** (`src/lib/socrata/`): whitelisted columns, escaped literals, timeouts,
  retry on 429/5xx, Zod validation, and it throws on any failure so ISR keeps the last good
  page.
- **Messy upstream data**: departments appear in many spellings; `src/config/regions.ts`
  maps them. The ETL normalizes them into the Parquet files.
- **ETL**: 30 days of precipitation (2.18 M rows, 9.3 MB Parquet) and 60 days of air
  temperature (0.92 M rows, 3.2 MB), ZSTD, sorted by department and time.
- **Isolation**: COOP/COEP only on `/explore` and `/lab`; plain `<a>` links into them; worker
  scripts and DuckDB assets are same-origin and carry COEP themselves.
- **Seven runners** share one integer workload and one checksum; a run fails if its
  checksum differs from the main thread's.

## 4. Methodology

See `/methodology`. Workload: key `(i*7919) mod 1000`, value `(i*104729) mod 10007`;
count, sum, min, max per key. 2 warm-ups + 7 measured runs per runner and size, runners in
random order, one at a time. Median, p95, min, IQR and n are reported; outliers flagged.

## 5. Results (E1, one device)

Device: Windows desktop, 16 logical cores, Chromium (the Claude desktop built-in browser),
multi-thread mode on, production build served locally (`next start`), so the server runner
has almost no network latency. File: `data/results/e1-windows-desktop-chromium.json`.

Median total time in ms (includes generating the data and moving it):

| Runner | 10k | 100k | 1M | 5M |
| --- | ---: | ---: | ---: | ---: |
| Same thread as the page | 0.6 | 6.0 | 55.4 | 274.7 |
| Background thread (copy) | 1.1 | 6.3 | 71.0 | 355.1 |
| Background thread (move) | 1.0 | 5.9 | 54.6 | 278.4 |
| Shared-memory threads | 2.3 | 5.7 | 53.9 | 286.4 |
| Database, 1 thread | 10.1 | 13.9 | 61.0 | 282.8 |
| Database, many threads | 11.9 | 21.3 | 55.9 | 345.6 |
| Server (localhost) | 7.5 | 9.9 | 63.8 | 298.8 |

All 252 runs returned the same checksum.

What the data shows:

- **Total time barely changes with placement at this workload.** Generating the input on
  the main thread dominates; the aggregation itself is cheap. Offloading only moves the
  cheap part.
- **Copying costs, moving does not.** At 5 M rows, structured-clone copy adds about 80 ms
  over transfer; transfer is within noise of the main thread.
- **The database wins nothing on wall time here but never blocks the page**, because it
  generates the data inside its own worker. Its fixed cost (~10 ms) dominates small sizes.
- **Many database threads were slower than one at 5 M** on this device. Thread start-up and
  the `coi` build's overhead outweigh parallel gains for a simple GROUP BY.
- **Freezes.** Runners that generate input on the main thread (copy, move, shared memory)
  froze the page for 50 to 320 ms at 1 M to 5 M rows; the database and server runners did
  not.

## 6. Trade-offs

- **SSR cost**: every dashboard visit queries upstream (~3 s per region). No caching by design.
- **ISR staleness**: up to one hour old; on-demand revalidation via `POST /api/revalidate`.
  Slow upstream aggregates forced dataset pages to render on first visit instead of at build.
- **CSR weight**: the DuckDB engine is ~35 MB uncompressed; it loads only on request.
- **Isolation side effects**: no third-party embeds on isolated routes; the Parquet
  extension must be self-hosted; the multi-thread engine cannot load Parquet in this release,
  so the explorer falls back to one thread.

## 7. Conclusion and limits

For a cheap aggregation, where the data is **produced** matters more than where it is
**computed**. Keep work off the main thread when the input is large, and prefer moving
(transfer) over copying. An in-browser database is worth its start-up cost when the data
already lives in files it reads itself (the explorer), not for tiny inputs.

Limits: one device and one browser so far; the server was on localhost; E2 (break-even vs.
server SoQL per query) and E3 on a phone are still to be measured. The main-thread runner's
own freeze is under-reported: long-task entries arrive after the run ends, so the harness
reads 0 for it. Fixing the sampler to wait for pending entries is the next step.

## 8. Reproduction

```bash
pnpm install
pnpm data:build
pnpm build && pnpm start
```

Open `/lab`, pick sizes and runners, press "Start benchmark", then "Export results" and
commit the JSON into `data/results/`.
