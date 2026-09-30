import { parseResponse, type WorkerRequest, type WorkerResponse } from "./protocol";

type Pending = { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void };

/** Promise wrapper around one aggregate worker. */
export class AggregateWorker {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor() {
    this.worker = new Worker(new URL("./aggregate.worker.ts", import.meta.url), {
      type: "module",
      name: "aggregate",
    });
    this.worker.onmessage = (e: MessageEvent<unknown>) => {
      let msg: WorkerResponse;
      try {
        msg = parseResponse(e.data);
      } catch (err) {
        this.failAll(new Error(`Invalid worker message: ${String(err)}`));
        return;
      }
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.type === "error") p.reject(new Error(msg.message));
      else p.resolve(msg);
    };
    this.worker.onerror = (e) => this.failAll(new Error(e.message || "Worker failed"));
  }

  private failAll(err: Error) {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }

  request(
    msg: DistributiveOmit<WorkerRequest, "id">,
    transfer: Transferable[] = [],
  ): Promise<WorkerResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id }, transfer);
    });
  }

  terminate() {
    this.failAll(new Error("Worker terminated"));
    this.worker.terminate();
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
