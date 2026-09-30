"use client";

import { Download, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Hyetograph } from "@/components/hyetograph/Hyetograph";
import { Button } from "@/components/ui/button";
import { IsolationNote } from "@/components/ui/isolation-note";
import { StatusNote } from "@/components/ui/status-note";
import { datasets, getDataset } from "@/config/datasets";
import { explorer } from "@/content/copy";
import duckdbVersion from "@/generated/duckdb-version.json";
import { dataFiles } from "@/lib/data-files";
import type { Engine, QueryTable } from "@/lib/duckdb/engine";
import { formatBytes, formatNumber } from "@/lib/time";
import { ResultTable } from "./ResultTable";
import { chartable, RENDER_CAP, toCsv, type QueryResult } from "./result";

const TIMEOUT_MS = 30_000;
const STORAGE_KEY = "ag-explorer-last-query";

type EngineState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; engine: Engine }
  | { kind: "error"; message: string };

type RunState =
  | { kind: "idle" }
  | { kind: "running"; startedAt: number }
  | { kind: "done"; result: QueryResult; ms: number }
  | { kind: "error"; message: string };

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/out of memory|OOM|memory access out of bounds/i.test(msg)) {
    return "The engine ran out of memory. Try fewer columns, a LIMIT or a shorter date range.";
  }
  if (/Parser Error|Binder Error|Catalog Error|syntax/i.test(msg)) {
    return `The query could not run: ${msg.split("\n")[0]}`;
  }
  return `The query stopped with an error: ${msg.split("\n")[0]}`;
}

function tableToResult(table: QueryTable): QueryResult {
  const rows: unknown[][] = [];
  const n = Math.min(table.numRows, 100_000);
  const vectors = table.schema.fields.map((_, i) => table.getChildAt(i));
  for (let r = 0; r < n; r++) {
    rows.push(
      vectors.map((v) => {
        const val: unknown = v?.get(r);
        return typeof val === "bigint" ? Number(val) : val;
      }),
    );
  }
  const columns = table.schema.fields.map((f, i) => {
    const sample = rows.find((row) => row[i] !== null && row[i] !== undefined)?.[i];
    return { name: f.name, numeric: typeof sample === "number" };
  });
  return { columns, rows, totalRows: table.numRows };
}

export function Explorer() {
  const params = useSearchParams();
  const initialDataset = getDataset(params.get("dataset") ?? "") ?? datasets[0]!;
  const [datasetSlug, setDatasetSlug] = useState(initialDataset.slug);
  const dataset = getDataset(datasetSlug) ?? datasets[0]!;
  const presetParam = params.get("preset");

  const [sql, setSql] = useState<string>(() => {
    const preset = initialDataset.presets.find((p) => p.id === presetParam);
    // A query from the URL only fills the editor; it is never auto-executed.
    return preset?.sql ?? initialDataset.presets[0]!.sql;
  });
  const [engineState, setEngineState] = useState<EngineState>({ kind: "idle" });
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const [localTables, setLocalTables] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const engineRef = useRef<Engine | null>(null);
  const viewFor = useRef<string | null>(null);

  // Restore the last query of this tab (after mount, so hydration output stays stable).
  useEffect(() => {
    if (presetParam) return;
    const stored = readStored();
    if (stored) {
      const id = requestAnimationFrame(() => setSql(stored));
      return () => cancelAnimationFrame(id);
    }
  }, [presetParam]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, sql);
    } catch {
      // Storage may be unavailable; persistence is a convenience only.
    }
  }, [sql]);

  useEffect(() => {
    return () => {
      const e = engineRef.current;
      if (e) void import("@/lib/duckdb/engine").then((m) => m.terminate(e));
    };
  }, []);

  const ensureView = useCallback(async (engine: Engine, slug: string) => {
    if (viewFor.current === slug) return;
    const { registerParquet, query } = await import("@/lib/duckdb/engine");
    const meta = dataFiles[slug];
    if (!meta) {
      // Data files not generated yet: local files still work.
      viewFor.current = slug;
      return;
    }
    const name = `${slug}.parquet`;
    await registerParquet(engine, name, meta.file);
    await query(engine, `CREATE OR REPLACE VIEW data AS SELECT * FROM read_parquet('${name}');`);
    viewFor.current = slug;
  }, []);

  const loadEngine = useCallback(async (): Promise<Engine | null> => {
    if (engineRef.current) return engineRef.current;
    if (typeof WebAssembly === "undefined" || typeof Worker === "undefined") {
      setEngineState({ kind: "error", message: explorer.unsupported });
      return null;
    }
    setEngineState({ kind: "loading" });
    try {
      const { initEngine } = await import("@/lib/duckdb/engine");
      const engine = await initEngine();
      engineRef.current = engine;
      await ensureView(engine, datasetSlug);
      setEngineState({ kind: "ready", engine });
      return engine;
    } catch (err) {
      setEngineState({
        kind: "error",
        message: `${explorer.unsupported} (${err instanceof Error ? err.message : String(err)})`,
      });
      return null;
    }
  }, [datasetSlug, ensureView]);

  const stop = useCallback(async () => {
    const e = engineRef.current;
    if (!e) return;
    // query() cannot be interrupted, so the engine is restarted.
    engineRef.current = null;
    viewFor.current = null;
    setLocalTables([]);
    const { terminate } = await import("@/lib/duckdb/engine");
    await terminate(e);
    setEngineState({ kind: "idle" });
    setRun({ kind: "error", message: "The query was stopped. Load the engine again to continue." });
  }, []);

  const runQuery = useCallback(async () => {
    const engine = await loadEngine();
    if (!engine) return;
    const startedAt = performance.now();
    setRun({ kind: "running", startedAt });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await ensureView(engine, datasetSlug);
      const { query } = await import("@/lib/duckdb/engine");
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
      });
      const table = await Promise.race([query(engine, sql), timeout]);
      const result = tableToResult(table);
      setRun({ kind: "done", result, ms: performance.now() - startedAt });
    } catch (err) {
      if (err instanceof Error && err.message === "timeout") {
        await stop();
        setRun({
          kind: "error",
          message: "The query stopped after 30 seconds. Try a shorter date range or fewer columns.",
        });
      } else {
        setRun({ kind: "error", message: friendlyError(err) });
      }
    } finally {
      clearTimeout(timer);
    }
  }, [datasetSlug, ensureView, loadEngine, sql, stop]);

  async function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await addLocalFile(file);
  }

  async function addLocalFile(file: File) {
    if (!/\.(csv|parquet)$/i.test(file.name)) {
      setRun({ kind: "error", message: "Only CSV and Parquet files can be queried here." });
      return;
    }
    const engine = await loadEngine();
    if (!engine) return;
    try {
      const { registerLocalFile, query } = await import("@/lib/duckdb/engine");
      const name = await registerLocalFile(engine, file);
      const table = `my_${name.replace(/\.[^.]+$/, "").replace(/\W/g, "_").toLowerCase()}`.slice(0, 48);
      const reader = /\.parquet$/i.test(name) ? "read_parquet" : "read_csv_auto";
      await query(engine, `CREATE OR REPLACE VIEW ${table} AS SELECT * FROM ${reader}('${name}');`);
      setLocalTables((t) => [...new Set([...t, table])]);
      setSql(`SELECT *\nFROM ${table}\nLIMIT 100;`);
    } catch (err) {
      setRun({ kind: "error", message: friendlyError(err) });
    }
  }

  function download() {
    if (run.kind !== "done") return;
    const blob = new Blob([toCsv(run.result)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aguacero-query.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const meta = dataFiles[dataset.slug];
  const engine = engineState.kind === "ready" ? engineState.engine : null;
  const engineMb = (duckdbVersion.bytes.eh / 1024 / 1024).toFixed(0);
  const chart = run.kind === "done" ? chartable(run.result) : null;

  return (
    <div className="mt-8 flex flex-col gap-8">
      <IsolationNote className="max-w-3xl" />

      <div className="grid gap-10 md:grid-cols-12">
        <aside className="flex flex-col gap-8 md:col-span-4 lg:col-span-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="dataset" className="text-small font-medium">
              Dataset
            </label>
            <select
              id="dataset"
              value={datasetSlug}
              onChange={(e) => {
                const next = getDataset(e.target.value) ?? datasets[0]!;
                setDatasetSlug(next.slug);
                setSql(next.presets[0]!.sql);
              }}
              className="h-11 rounded-[6px] border border-line-strong bg-paper px-3"
            >
              {datasets.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.title}
                </option>
              ))}
            </select>
            {!meta ? (
              <p className="mt-1 text-small text-ash">
                The data file for this dataset is being prepared. You can still query your own
                files.
              </p>
            ) : null}
            {meta ? (
              <p className="mt-1 text-small text-ash">
                {formatNumber(meta.rows)} readings from the last {meta.days} days, table{" "}
                <code>data</code>. File size {formatBytes(meta.bytes)}.
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="text-h3">Questions</h2>
            <ul className="mt-2 flex flex-col">
              {dataset.presets.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSql(p.sql)}
                    className="min-h-11 py-1 text-left text-river hover:text-river-deep hover:underline"
                  >
                    {p.question}
                  </button>
                </li>
              ))}
            </ul>
            <details className="disclosure mt-2 text-small">
              <summary>Columns in data</summary>
              <ul className="mt-1 flex flex-col gap-1 text-ash">
                {meta?.columns.map((c) => (
                  <li key={c.name}>
                    <code className="text-basalt">{c.name}</code> {c.description}
                  </li>
                ))}
              </ul>
            </details>
          </div>

          <div>
            <h2 className="text-h3">Your files</h2>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => void onDrop(e)}
              className={`mt-2 flex min-h-28 cursor-pointer flex-col items-start gap-2 rounded-[6px] border border-dashed p-4 text-small ${dragging ? "border-river bg-paper" : "border-line-strong"}`}
            >
              <Upload size={20} strokeWidth={1.5} aria-hidden="true" className="text-river" />
              <span>{explorer.localHint}</span>
              <input
                type="file"
                accept=".csv,.parquet"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void addLocalFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {localTables.length > 0 ? (
              <p className="mt-2 text-small text-ash">
                Your tables: {localTables.map((t) => <code key={t} className="mr-2 text-basalt">{t}</code>)}
              </p>
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-4 md:col-span-8 lg:col-span-9" aria-label="Query">
          {engineState.kind === "idle" ? (
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-small text-ash">{explorer.engineIdle(engineMb)}</p>
              <Button variant="secondary" onClick={() => void loadEngine()}>
                {explorer.loadEngine}
              </Button>
            </div>
          ) : null}
          {engineState.kind === "loading" ? (
            <p role="status" className="pulse-late text-small text-ash">
              {explorer.loadingEngine}.
            </p>
          ) : null}
          {engineState.kind === "error" ? (
            <StatusNote tone="warning" role="alert">
              {engineState.message}
            </StatusNote>
          ) : null}
          {engine ? (
            <p role="status" className="text-small text-ash" data-testid="engine-status">
              Engine ready: {engine.bundle === "coi" ? "multi-thread" : "single-thread"} build (
              {engine.bundle}), {engine.threads} {engine.threads === 1 ? "thread" : "threads"}.
            </p>
          ) : null}

          <div className="flex flex-col gap-1">
            <label htmlFor="sql" className="text-small font-medium">
              SQL editor
            </label>
            <textarea
              id="sql"
              value={sql}
              spellCheck={false}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void runQuery();
                }
              }}
              rows={8}
              className="code min-h-40 resize-y rounded-[6px] border border-line-strong bg-paper p-3 text-[0.9375rem] leading-relaxed"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void runQuery()} disabled={run.kind === "running" || engineState.kind === "loading"}>
              {explorer.run}
            </Button>
            <Button variant="quiet" onClick={() => void stop()} disabled={run.kind !== "running"}>
              {explorer.stop}
            </Button>
            <span className="text-small text-ash">
              <kbd>Ctrl</kbd> or <kbd>Cmd</kbd> + <kbd>Enter</kbd>
            </span>
          </div>

          <div aria-live="polite">
            {run.kind === "running" ? (
              <p role="status" className="pulse-late text-small text-ash">
                Running the query.
              </p>
            ) : null}
            {run.kind === "error" ? (
              <StatusNote tone="warning" role="alert">
                {run.message}
              </StatusNote>
            ) : null}
          </div>

          {run.kind === "done" ? (
            <div className="flex flex-col gap-4" data-testid="result">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p role="status" className="text-small text-ash">
                  Ran in {formatNumber(run.ms)} ms on {engine?.threads ?? 1}{" "}
                  {(engine?.threads ?? 1) === 1 ? "thread" : "threads"}.{" "}
                  {formatNumber(run.result.totalRows)} rows
                  {run.result.totalRows > RENDER_CAP
                    ? `, showing the first ${formatNumber(RENDER_CAP)}`
                    : ""}
                  .
                </p>
                <Button variant="secondary" onClick={download}>
                  <Download size={20} strokeWidth={1.5} aria-hidden="true" />
                  Download CSV
                </Button>
              </div>
              {chart ? (
                <Hyetograph
                  items={chart}
                  unit={run.result.columns[1]!.name}
                  title={`Query result: ${run.result.columns[1]!.name} by ${run.result.columns[0]!.name}`}
                  description="Bars hang from the top axis; longer means more."
                  height={9}
                  decimals={1}
                />
              ) : null}
              <ResultTable result={run.result} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
