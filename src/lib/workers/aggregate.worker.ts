/// <reference lib="webworker" />
import { aggregate, emptyPartials, GROUPS, type Partials } from "@/lib/bench/core";
import type { WorkerRequest, WorkerResponse } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

function pack(p: Partials): Float64Array {
  const out = new Float64Array(4 * GROUPS);
  out.set(p.count, 0);
  out.set(p.sum, GROUPS);
  out.set(p.min, 2 * GROUPS);
  out.set(p.max, 3 * GROUPS);
  return out;
}

function reply(msg: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(msg, transfer);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case "init":
        reply({ id: msg.id, type: "ready" });
        return;
      case "run": {
        const t0 = performance.now();
        const partials = pack(aggregate(msg.keys, msg.values));
        const computeMs = performance.now() - t0;
        reply({ id: msg.id, type: "result", computeMs, partials }, [partials.buffer]);
        return;
      }
      case "run-shared": {
        const t0 = performance.now();
        // Each worker writes only its own region: no locks needed.
        const local = aggregate(msg.keys, msg.values, msg.from, msg.to, emptyPartials());
        const base = msg.slot * 4 * GROUPS;
        msg.partials.set(local.count, base);
        msg.partials.set(local.sum, base + GROUPS);
        msg.partials.set(local.min, base + 2 * GROUPS);
        msg.partials.set(local.max, base + 3 * GROUPS);
        Atomics.add(msg.counter, 0, 1);
        reply({ id: msg.id, type: "result", computeMs: performance.now() - t0 });
        return;
      }
      default: {
        const unknown = msg as { id?: number; type?: string };
        reply({ id: unknown.id ?? -1, type: "error", message: `Unknown message ${unknown.type}` });
      }
    }
  } catch (err) {
    reply({ id: msg.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
