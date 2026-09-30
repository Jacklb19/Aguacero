"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { IsolationNote, useIsolation } from "@/components/ui/isolation-note";
import { StatusNote } from "@/components/ui/status-note";
import { Toast } from "@/components/ui/toast";
import { lab, runnerNames } from "@/content/copy";
import { buildSuite, runSuite } from "@/lib/bench/harness";
import { runnerIds, suiteSchema, type Run, type RunnerId } from "@/lib/bench/result-schema";
import { summarize } from "@/lib/bench/stats";
import { formatNumber } from "@/lib/time";
import { FreezeMeter } from "./FreezeMeter";

const SIZES = [10_000, 100_000, 1_000_000, 5_000_000, 10_000_000] as const;
const label = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1000}k`);
const needsIsolation: RunnerId[] = ["worker-pool-sab", "duckdb-mt"];

export function Lab() {
  const iso = useIsolation();
  const [sizes, setSizes] = useState<number[]>([10_000, 100_000, 1_000_000]);
  const [runners, setRunners] = useState<RunnerId[]>(["main", "worker-copy", "worker-transfer", "server"]);
  const [iterations, setIterations] = useState(7);
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [skips, setSkips] = useState<string[]>([]);
  const [toast, setToast] = useState<{ seq: number; msg: string } | null>(null);
  const [bundle, setBundle] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isolated = iso?.isolated ?? false;
  const disabledReason = (id: RunnerId) =>
    needsIsolation.includes(id) && !isolated ? "needs multi-thread mode, which is off in this browser" : null;

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  async function start() {
    const controller = new AbortController();
    abortRef.current = controller;
    setRuns([]);
    setSkips([]);
    setRunning(true);
    const cfg = {
      sizes: [...sizes].sort((a, b) => a - b),
      runners: runners.filter((r) => !disabledReason(r)),
      warmups: 2,
      iterations,
    };
    const all = await runSuite(cfg, {
      signal: controller.signal,
      onRun: (r) => setRuns((prev) => [...prev, r]),
      onProgress: (done, total, l) => setProgress({ done, total, label: l }),
      onSkip: (runner, reason) => setSkips((s) => [...s, `${runnerNames[runner]}: ${reason}`]),
      onDuckdbBundle: setBundle,
    });
    setRunning(false);
    const measured = all.filter((r) => !r.warmup).length;
    setToast({ seq: Date.now(), msg: lab.finished(measured) });
  }

  function exportResults() {
    const suite = buildSuite(
      { sizes: [...sizes].sort((a, b) => a - b), runners, warmups: 2, iterations },
      runs,
      {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
        crossOriginIsolated: self.crossOriginIsolated === true,
        duckdbBundle: bundle,
        build: process.env.NEXT_PUBLIC_BUILD_ID ?? "local",
        date: new Date().toISOString(),
      },
    );
    const valid = suiteSchema.parse(suite);
    const blob = new Blob([JSON.stringify(valid, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aguacero-results-${valid.environment.date.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ seq: Date.now(), msg: lab.exported });
  }

  const measured = runs.filter((r) => !r.warmup);
  const cells = new Map<string, { median: number; ok: boolean; n: number }>();
  for (const id of runnerIds) {
    for (const s of sizes) {
      const rs = measured.filter((r) => r.runner === id && r.rows === s);
      if (rs.length) {
        cells.set(`${id}:${s}`, {
          median: summarize(rs.map((r) => r.totalMs)).median,
          ok: rs.every((r) => r.checksumOk),
          n: rs.length,
        });
      }
    }
  }
  const maxBySize = new Map(
    sizes.map((s) => [s, Math.max(1, ...runnerIds.map((id) => cells.get(`${id}:${s}`)?.median ?? 0))]),
  );
  const lastRun = runs[runs.length - 1];
  const worstFreeze = measured.length ? Math.max(...measured.map((r) => r.mainThreadBlockedMs)) : null;
  const allOk = measured.length > 0 && measured.every((r) => r.checksumOk);
  const sortedSizes = [...sizes].sort((a, b) => a - b);

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <IsolationNote className="max-w-2xl flex-1" />
        <FreezeMeter running={running} frozeMs={running ? null : (lastRun?.mainThreadBlockedMs ?? null)} />
      </div>

      <div className="grid gap-10 md:grid-cols-12">
        <form
          className="flex flex-col gap-6 md:col-span-4 lg:col-span-3"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <fieldset>
            <legend className="text-h3 font-heading font-bold">Data sizes</legend>
            {SIZES.map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--river)]"
                  checked={sizes.includes(s)}
                  onChange={() => setSizes((v) => toggle(v, s))}
                  disabled={running}
                />
                {label(s)} rows{s === 10_000_000 ? " (desktop only)" : ""}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="text-h3 font-heading font-bold">Runners</legend>
            {runnerIds.map((id) => {
              const reason = disabledReason(id);
              return (
                <label key={id} className="flex min-h-11 items-start gap-3 py-1">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-[var(--river)]"
                    checked={runners.includes(id) && !reason}
                    disabled={!!reason || running}
                    onChange={() => setRunners((v) => toggle(v, id))}
                  />
                  <span>
                    {runnerNames[id]}
                    {reason ? <span className="block text-small text-ash">Disabled: {reason}.</span> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor="iterations" className="text-small font-medium">
              Runs per test
            </label>
            <select
              id="iterations"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              disabled={running}
              className="h-11 rounded-[6px] border border-line-strong bg-paper px-3"
            >
              {[3, 5, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={running || sizes.length === 0 || runners.length === 0}>
              {lab.start}
            </Button>
            <Button variant="quiet" disabled={!running} onClick={() => abortRef.current?.abort()}>
              {lab.stop}
            </Button>
            <Button variant="secondary" disabled={running || measured.length === 0} onClick={exportResults}>
              {lab.export}
            </Button>
          </div>
        </form>

        <section className="min-w-0 md:col-span-8 lg:col-span-9" aria-label="Live results">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[34rem] gap-2"
              style={{ gridTemplateColumns: `minmax(10rem, 13rem) repeat(${sortedSizes.length}, 1fr)` }}
              role="img"
              aria-label="Median total time per runner and data size; longer bars mean slower"
            >
              <span className="text-small font-medium">Runner</span>
              {sortedSizes.map((s) => (
                <span key={s} className="border-b-2 border-basalt pb-1 text-small text-ash tabular">
                  {label(s)}
                </span>
              ))}
              {runnerIds.map((id) => (
                <div key={id} className="contents">
                  <span className="text-small">{runnerNames[id]}</span>
                  {sortedSizes.map((s) => {
                    const c = cells.get(`${id}:${s}`);
                    return (
                      <div key={s} className="relative h-12">
                        {c ? (
                          <>
                            <div
                              className="absolute top-0 left-1 w-3 rounded-b-[3px]"
                              style={
                                {
                                  height: `${Math.max(4, (c.median / (maxBySize.get(s) ?? 1)) * 100)}%`,
                                  background: `var(--runner-${id})`,
                                } as CSSProperties
                              }
                            />
                            <span className="absolute top-0 left-6 text-tiny tabular">
                              {c.median < 10 ? c.median.toFixed(2) : formatNumber(c.median)} ms
                              {c.ok ? "" : ", mismatch"}
                            </span>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3" aria-live="polite">
            {progress ? (
              <p role="status" className="text-small text-ash">
                {progress.done} of {progress.total} runs. {running ? `Now: ${progress.label}.` : ""}
              </p>
            ) : null}
            {measured.length > 0 ? (
              allOk ? (
                <StatusNote>Correctness check: every runner returned the same checksum.</StatusNote>
              ) : (
                <StatusNote tone="warning" role="alert">
                  Correctness check failed: at least one runner returned a different checksum.
                </StatusNote>
              )
            ) : null}
            {!running && worstFreeze !== null ? (
              <p className="text-small text-ash">
                Longest freeze in this suite: {formatNumber(worstFreeze)} ms.
              </p>
            ) : null}
            {skips.length > 0 ? (
              <ul className="text-small text-ash">
                {skips.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>
      {toast ? <Toast key={toast.seq} message={toast.msg} /> : null}
    </div>
  );
}
