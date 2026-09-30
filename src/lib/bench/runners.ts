/**
 * The seven benchmark runners (README §6.4). Browser-only.
 * Each returns the same checksum for the same N, or the harness marks the run as failed.
 */
import type { Engine } from "@/lib/duckdb/engine";
import { AggregateWorker } from "@/lib/workers/client";
import {
  aggregate,
  checksum,
  emptyPartials,
  generate,
  generateInto,
  GROUPS,
  mergePartials,
  duckdbWorkloadSql,
  type Partials,
} from "./core";
import type { RunnerId } from "./result-schema";

export interface RunMeasure {
  setupMs: number;
  computeMs: number;
  totalMs: number;
  bytesMoved: number;
  checksum: number;
}

export interface Runner {
  id: RunnerId;
  run(rows: number): Promise<RunMeasure>;
  dispose(): Promise<void>;
}

function unpack(buf: Float64Array, offset = 0): Partials {
  return {
    count: buf.slice(offset, offset + GROUPS),
    sum: buf.slice(offset + GROUPS, offset + 2 * GROUPS),
    min: buf.slice(offset + 2 * GROUPS, offset + 3 * GROUPS),
    max: buf.slice(offset + 3 * GROUPS, offset + 4 * GROUPS),
  };
}

export function mainRunner(): Runner {
  return {
    id: "main",
    async run(rows) {
      const t0 = performance.now();
      const { keys, values } = generate(rows);
      const t1 = performance.now();
      const p = aggregate(keys, values);
      const t2 = performance.now();
      return {
        setupMs: t1 - t0,
        computeMs: t2 - t1,
        totalMs: t2 - t0,
        bytesMoved: 0,
        checksum: checksum(p),
      };
    },
    async dispose() {},
  };
}

export function workerRunner(mode: "copy" | "transfer"): Runner {
  const worker = new AggregateWorker();
  return {
    id: mode === "copy" ? "worker-copy" : "worker-transfer",
    async run(rows) {
      const t0 = performance.now();
      const { keys, values } = generate(rows);
      const t1 = performance.now();
      // Copy: structured clone duplicates both arrays. Transfer: buffers move and are
      // detached here (sender loses access).
      const transfer = mode === "transfer" ? [keys.buffer, values.buffer] : [];
      const res = await worker.request({ type: "run", keys, values }, transfer);
      const t2 = performance.now();
      if (res.type !== "result" || !res.partials) throw new Error("Worker returned no partials");
      return {
        setupMs: t1 - t0,
        computeMs: res.computeMs,
        totalMs: t2 - t0,
        bytesMoved: mode === "copy" ? rows * 8 + res.partials.byteLength : res.partials.byteLength,
        checksum: checksum(unpack(res.partials)),
      };
    },
    async dispose() {
      worker.terminate();
    },
  };
}

export function poolSize(): number {
  const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  return Math.min(8, Math.max(1, hc - 1));
}

export function poolRunner(): Runner {
  if (!self.crossOriginIsolated) throw new Error("Shared memory needs multi-thread mode.");
  const n = poolSize();
  const workers = Array.from({ length: n }, () => new AggregateWorker());
  return {
    id: "worker-pool-sab",
    async run(rows) {
      const t0 = performance.now();
      const keys = new Int32Array(new SharedArrayBuffer(rows * 4));
      const values = new Int32Array(new SharedArrayBuffer(rows * 4));
      generateInto(keys, values, 0, rows);
      const partials = new Float64Array(new SharedArrayBuffer(n * 4 * GROUPS * 8));
      const counter = new Int32Array(new SharedArrayBuffer(4));
      const t1 = performance.now();
      const chunk = Math.ceil(rows / n);
      const replies = await Promise.all(
        workers.map((w, slot) =>
          w.request({
            type: "run-shared",
            keys,
            values,
            from: Math.min(rows, slot * chunk),
            to: Math.min(rows, (slot + 1) * chunk),
            partials,
            slot,
            counter,
          }),
        ),
      );
      // Never Atomics.wait on the main thread; the counter is only a correctness check.
      if (Atomics.load(counter, 0) !== n) throw new Error("Not every worker finished");
      const merged = mergePartials(workers.map((_, slot) => unpack(partials, slot * 4 * GROUPS)));
      const t2 = performance.now();
      const computeMs = Math.max(
        ...replies.map((r) => (r.type === "result" ? r.computeMs : 0)),
      );
      return {
        setupMs: t1 - t0,
        computeMs,
        totalMs: t2 - t0,
        bytesMoved: 0,
        checksum: checksum(merged),
      };
    },
    async dispose() {
      for (const w of workers) w.terminate();
    },
  };
}

export async function duckdbRunner(multi: boolean): Promise<Runner & { engine: Engine }> {
  const { initEngine, query, terminate } = await import("@/lib/duckdb/engine");
  if (multi && !self.crossOriginIsolated) throw new Error("Needs multi-thread mode.");
  const engine = await initEngine({ singleThread: !multi });
  if (multi && engine.bundle !== "coi") {
    await terminate(engine);
    throw new Error("This browser cannot run the multi-thread database build.");
  }
  return {
    id: multi ? "duckdb-mt" : "duckdb-st",
    engine,
    async run(rows) {
      const { setup, query: q } = duckdbWorkloadSql(rows);
      const t0 = performance.now();
      await query(engine, setup);
      const t1 = performance.now();
      const table = await query(engine, q);
      const t2 = performance.now();
      const sums = new Float64Array(GROUPS);
      const kCol = table.getChild("k");
      const sCol = table.getChild("s");
      if (!kCol || !sCol || table.numRows !== GROUPS) throw new Error("Unexpected result shape");
      for (let i = 0; i < table.numRows; i++) sums[Number(kCol.get(i))] = Number(sCol.get(i));
      const p = emptyPartials();
      p.sum.set(sums);
      return {
        setupMs: t1 - t0,
        computeMs: t2 - t1,
        totalMs: t2 - t0,
        bytesMoved: 0,
        checksum: checksum(p),
      };
    },
    async dispose() {
      await terminate(engine);
    },
  };
}

export function serverRunner(): Runner {
  return {
    id: "server",
    async run(rows) {
      const body = JSON.stringify({ rows });
      const t0 = performance.now();
      const res = await fetch("/api/bench/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });
      const text = await res.text();
      const t1 = performance.now();
      if (!res.ok) throw new Error(`Server answered ${res.status}`);
      const json = JSON.parse(text) as { checksum: number; computeMs: number };
      return {
        setupMs: 0,
        computeMs: json.computeMs,
        totalMs: t1 - t0,
        bytesMoved: body.length + text.length,
        checksum: json.checksum,
      };
    },
    async dispose() {},
  };
}
