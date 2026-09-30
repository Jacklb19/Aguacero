import type { CSSProperties } from "react";
import { Section } from "@/components/layout/Prose";
import { runnerNames } from "@/content/copy";
import type { LoadedSuite } from "@/lib/bench/load-results";
import { runnerIds, type RunnerId, type Suite } from "@/lib/bench/result-schema";
import { summarize, type Summary } from "@/lib/bench/stats";
import { bogotaDate, formatNumber } from "@/lib/time";

type Cell = { runner: RunnerId; rows: number; summary: Summary; ok: boolean };

function cells(suite: Suite): Cell[] {
  const out: Cell[] = [];
  for (const runner of runnerIds) {
    for (const rows of suite.config.sizes) {
      const runs = suite.runs.filter((r) => r.runner === runner && r.rows === rows && !r.warmup);
      if (runs.length === 0) continue;
      out.push({
        runner,
        rows,
        summary: summarize(runs.map((r) => r.totalMs)),
        ok: runs.every((r) => r.checksumOk),
      });
    }
  }
  return out;
}

/** Smallest size at which `runner` beats `main` on median total time, if any. */
export function crossover(all: Cell[], runner: RunnerId): number | null {
  const sizes = [...new Set(all.map((c) => c.rows))].sort((a, b) => a - b);
  for (const rows of sizes) {
    const base = all.find((c) => c.runner === "main" && c.rows === rows);
    const other = all.find((c) => c.runner === runner && c.rows === rows);
    if (base && other && other.summary.median < base.summary.median) return rows;
  }
  return null;
}

const ms = (v: number) => (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : formatNumber(v));
const rowsLabel = (n: number) =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}k` : String(n);

function SuiteBlock({ file, suite }: LoadedSuite) {
  const all = cells(suite);
  const sizes = suite.config.sizes;
  const runners = runnerIds.filter((r) => all.some((c) => c.runner === r));
  const maxBySize = new Map(
    sizes.map((s) => [s, Math.max(...all.filter((c) => c.rows === s).map((c) => c.summary.median))]),
  );
  const env = suite.environment;
  const id = file.replace(/\W+/g, "-");

  return (
    <Section id={id} title={`${suite.experiment}: ${env.label ?? "Device"} on ${bogotaDate(env.date)}`}>
      <p className="prose-measure mt-4 text-small text-ash">
        {env.hardwareConcurrency} logical cores
        {env.deviceMemory ? `, ${env.deviceMemory} GB memory hint` : ""}. Multi-thread mode was{" "}
        {env.crossOriginIsolated ? "on" : "off"}. Database bundle: {env.duckdbBundle ?? "not used"}.
        Build {env.build}. Browser: {env.userAgent}.
      </p>

      <figure className="mt-8">
        <div
          role="img"
          aria-label={`Median total time per runner and data size, ${suite.experiment}`}
          className="overflow-x-auto"
        >
          <div
            className="grid min-w-[36rem] gap-x-2 gap-y-2"
            style={{ gridTemplateColumns: `minmax(10rem, 14rem) repeat(${sizes.length}, 1fr)` }}
            aria-hidden="true"
          >
            <span />
            {sizes.map((s) => (
              <span key={s} className="border-b-2 border-basalt pb-1 text-small text-ash tabular">
                {rowsLabel(s)} rows
              </span>
            ))}
            {runners.map((runner) => (
              <div key={runner} className="contents">
                <span className="text-small text-basalt">{runnerNames[runner]}</span>
                {sizes.map((s) => {
                  const c = all.find((x) => x.runner === runner && x.rows === s);
                  const max = maxBySize.get(s) ?? 1;
                  return (
                    <div key={s} className="relative h-10">
                      {c ? (
                        <>
                          <div
                            className="hyeto-bar absolute top-0 left-0 h-3"
                            style={
                              {
                                width: `${Math.max(2, (c.summary.median / max) * 100)}%`,
                                background: `var(--runner-${runner})`,
                                borderRadius: "0 3px 3px 0",
                              } as CSSProperties
                            }
                          />
                          <span className="absolute top-4 left-0 text-tiny text-ash tabular">
                            {ms(c.summary.median)} ms{c.ok ? "" : ", checksum mismatch"}
                          </span>
                        </>
                      ) : (
                        <span className="text-tiny text-ash">not run</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <figcaption className="mt-4 text-small text-ash">
          Median total time, including setup and data movement. Bars are scaled within each
          column; a longer bar means slower.
        </figcaption>
      </figure>

      <ul className="prose-measure mt-6 flex flex-col gap-1">
        {runners
          .filter((r) => r !== "main")
          .map((r) => {
            const x = crossover(all, r);
            return (
              <li key={r}>
                {runnerNames[r]}:{" "}
                {x === null
                  ? "never faster than the page itself at the sizes tested."
                  : `faster than the page itself from ${rowsLabel(x)} rows.`}
              </li>
            );
          })}
      </ul>

      <details className="disclosure mt-4 text-small">
        <summary>View as table</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[40rem] border-collapse">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-2 pr-4 font-medium">Runner</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Rows</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Median ms</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">p95 ms</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Min ms</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">IQR ms</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">n</th>
                <th scope="col" className="py-2 text-right font-medium">Outliers</th>
              </tr>
            </thead>
            <tbody>
              {all.map((c) => (
                <tr key={`${c.runner}-${c.rows}`} className="border-b border-line">
                  <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                    {runnerNames[c.runner]}
                  </th>
                  <td className="py-1.5 pr-4 text-right tabular">{formatNumber(c.rows)}</td>
                  <td className="py-1.5 pr-4 text-right tabular">{ms(c.summary.median)}</td>
                  <td className="py-1.5 pr-4 text-right tabular">{ms(c.summary.p95)}</td>
                  <td className="py-1.5 pr-4 text-right tabular">{ms(c.summary.min)}</td>
                  <td className="py-1.5 pr-4 text-right tabular">{ms(c.summary.iqr)}</td>
                  <td className="py-1.5 pr-4 text-right tabular">{c.summary.n}</td>
                  <td className="py-1.5 text-right tabular">{c.summary.outliers.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {suite.breakEven && suite.breakEven.length > 0 ? (
        <BreakEven points={suite.breakEven} />
      ) : null}
    </Section>
  );
}

function BreakEven({ points }: { points: NonNullable<Suite["breakEven"]> }) {
  const at = points.find((p) => p.clientMs <= p.serverMs);
  return (
    <div className="mt-8">
      <h3 className="text-h3">Break-even: browser database versus server per query</h3>
      <p className="prose-measure mt-2">
        {at
          ? `The browser approach caught up after ${at.queries} queries.`
          : `The browser approach did not catch up within ${points.length} queries.`}
      </p>
      <details className="disclosure mt-2 text-small">
        <summary>View as table</summary>
        <table className="mt-2 w-full max-w-lg border-collapse">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pr-4 text-right font-medium">Queries</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Browser, cumulative ms</th>
              <th scope="col" className="py-2 text-right font-medium">Server, cumulative ms</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.queries} className="border-b border-line">
                <td className="py-1.5 pr-4 text-right tabular">{p.queries}</td>
                <td className="py-1.5 pr-4 text-right tabular">{formatNumber(p.clientMs)}</td>
                <td className="py-1.5 text-right tabular">{formatNumber(p.serverMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function ResultsView({ suites }: { suites: LoadedSuite[] }) {
  return (
    <>
      {suites.map((s) => (
        <SuiteBlock key={s.file} {...s} />
      ))}
    </>
  );
}
