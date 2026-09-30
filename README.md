# Aguacero

Colombian climate data, computed in your browser.

Aguacero is a web app and case study about one question: where should a computation run
(server, main thread, one Web Worker, a pool of Workers sharing memory, or an in-browser
WASM database), and at what data size does the answer change?

It uses IDEAM climate data from datos.gov.co and four rendering patterns on purpose:
SSG, ISR, SSR and CSR. See `src/config/routes.ts` for the route map.

## Run locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and fill in the values you have.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js (copies DuckDB-Wasm assets first) |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Quality gates |
| `pnpm e2e` | Playwright end-to-end tests |
| `pnpm data:build` | ETL: datos.gov.co slice to Parquet in `public/data` |
| `pnpm data:hero` | Regenerates the home page chart data |

## Docs

- `docs/DECISIONS.md`: architecture decision log
- `docs/DESIGN_NOTES.md`: design plan and self-critique
- `docs/CASE_STUDY.md`: the case study

Data: IDEAM, through Datos Abiertos Colombia (CC BY-SA 4.0). Aguacero is an independent
project and not an official IDEAM product.
