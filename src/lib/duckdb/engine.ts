/**
 * Browser-only facade over DuckDB-Wasm (README §6.3). Never import from Server Components.
 * Bundles are self-hosted under /duckdb/<version>/ so they load on cross-origin isolated pages.
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import duckdbVersion from "@/generated/duckdb-version.json";

export type BundleName = "mvp" | "eh" | "coi";

export interface Engine {
  db: AsyncDuckDB;
  conn: AsyncDuckDBConnection;
  bundle: BundleName;
  threads: number;
  worker: Worker;
}

export const DUCKDB_BASE = `/duckdb/${duckdbVersion.version}`;

function bundles() {
  const base = `${window.location.origin}${DUCKDB_BASE}`;
  // The CDN helper only returns mvp and eh; coi is added explicitly (README §15).
  return {
    mvp: {
      mainModule: `${base}/duckdb-mvp.wasm`,
      mainWorker: `${base}/duckdb-browser-mvp.worker.js`,
    },
    eh: {
      mainModule: `${base}/duckdb-eh.wasm`,
      mainWorker: `${base}/duckdb-browser-eh.worker.js`,
    },
    coi: {
      mainModule: `${base}/duckdb-coi.wasm`,
      mainWorker: `${base}/duckdb-browser-coi.worker.js`,
      pthreadWorker: `${base}/duckdb-browser-coi.pthread.worker.js`,
    },
  };
}

function nameOf(mainModule: string): BundleName {
  if (mainModule.includes("-coi")) return "coi";
  if (mainModule.includes("-eh")) return "eh";
  return "mvp";
}

export interface InitOptions {
  /** Force a single-thread bundle even on isolated pages (used by the lab's duckdb-st runner). */
  singleThread?: boolean;
  threads?: number;
}

export async function initEngine(opts: InitOptions = {}): Promise<Engine> {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const all = bundles();
  const selection = opts.singleThread
    ? { mvp: all.mvp, eh: all.eh }
    : all;
  const bundle = await duckdb.selectBundle(selection);
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const name = nameOf(bundle.mainModule);
  const threads =
    name === "coi"
      ? Math.max(1, Math.min(opts.threads ?? navigator.hardwareConcurrency ?? 4, 16))
      : 1;
  await db.open({
    query: { castBigIntToDouble: true, castDecimalToDouble: true, castTimestampToDate: true },
    ...(name === "coi" ? { maximumThreads: threads } : {}),
  });
  const conn = await db.connect();
  if (name === "coi") await conn.query(`SET threads = ${threads};`);
  return { db, conn, bundle: name, threads, worker };
}

export async function registerParquet(engine: Engine, name: string, url: string): Promise<void> {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const absolute = new URL(url, window.location.origin).toString();
  await engine.db.registerFileURL(name, absolute, duckdb.DuckDBDataProtocol.HTTP, false);
}

/** Registers a user's local file. It is read in place and never uploaded. */
export async function registerLocalFile(engine: Engine, file: File): Promise<string> {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const safe = file.name.replace(/[^\w.-]/g, "_");
  await engine.db.registerFileHandle(
    safe,
    file,
    duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
    true,
  );
  return safe;
}

export type QueryTable = Awaited<ReturnType<AsyncDuckDBConnection["query"]>>;

export async function query(engine: Engine, sql: string): Promise<QueryTable> {
  return engine.conn.query(sql);
}

export async function cancel(engine: Engine): Promise<void> {
  await engine.conn.cancelSent().catch(() => false);
}

export async function terminate(engine: Engine): Promise<void> {
  await engine.conn.close().catch(() => undefined);
  await engine.db.terminate().catch(() => undefined);
  engine.worker.terminate();
}
