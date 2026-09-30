import { z } from "zod";

/**
 * Typed message protocol between the page and aggregate workers (README §6.4).
 * Every message carries an `id`. Workers answer every request with `result` or `error`.
 */
export type WorkerRequest =
  | { id: number; type: "init"; slot: number }
  | {
      id: number;
      type: "run";
      /** Copied (structured clone) or moved (transferred), decided by the sender. */
      keys: Int32Array;
      values: Int32Array;
    }
  | {
      id: number;
      type: "run-shared";
      keys: Int32Array;
      values: Int32Array;
      from: number;
      to: number;
      /** Float64Array over a SharedArrayBuffer: 4 * GROUPS doubles per worker slot. */
      partials: Float64Array;
      slot: number;
      /** Int32Array over a SharedArrayBuffer; index 0 counts finished workers. */
      counter: Int32Array;
    };

export type WorkerResponse =
  | { id: number; type: "ready" }
  | {
      id: number;
      type: "result";
      computeMs: number;
      /** Only for `run`: count, sum, min, max concatenated (4 * GROUPS doubles), transferred back. */
      partials?: Float64Array;
    }
  | { id: number; type: "error"; message: string };

const responseSchema = z.discriminatedUnion("type", [
  z.object({ id: z.number().int(), type: z.literal("ready") }),
  z.object({
    id: z.number().int(),
    type: z.literal("result"),
    computeMs: z.number().nonnegative(),
    partials: z.instanceof(Float64Array).optional(),
  }),
  z.object({ id: z.number().int(), type: z.literal("error"), message: z.string() }),
]);

/** Validates worker replies in development; trusted as-is in production for speed. */
export function parseResponse(data: unknown): WorkerResponse {
  if (process.env.NODE_ENV !== "production") return responseSchema.parse(data) as WorkerResponse;
  return data as WorkerResponse;
}

export const requestTypes = ["init", "run", "run-shared"] as const;
