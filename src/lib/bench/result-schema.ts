import { z } from "zod";

export const runnerIds = [
  "main",
  "worker-copy",
  "worker-transfer",
  "worker-pool-sab",
  "duckdb-st",
  "duckdb-mt",
  "server",
] as const;
export type RunnerId = (typeof runnerIds)[number];
export const runnerIdSchema = z.enum(runnerIds);

export const runSchema = z.object({
  runner: runnerIdSchema,
  rows: z.number().int().positive(),
  iteration: z.number().int().nonnegative(),
  warmup: z.boolean(),
  setupMs: z.number().nonnegative(),
  computeMs: z.number().nonnegative(),
  totalMs: z.number().nonnegative(),
  bytesMoved: z.number().nonnegative(),
  mainThreadBlockedMs: z.number().nonnegative(),
  peakFrameGapMs: z.number().nonnegative(),
  checksum: z.number().int(),
  checksumOk: z.boolean(),
});
export type Run = z.infer<typeof runSchema>;

export const environmentSchema = z.object({
  userAgent: z.string(),
  hardwareConcurrency: z.number().int().nonnegative(),
  deviceMemory: z.number().nullable(),
  crossOriginIsolated: z.boolean(),
  duckdbBundle: z.string().nullable(),
  build: z.string(),
  date: z.string(),
  label: z.string().optional(),
});
export type BenchEnvironment = z.infer<typeof environmentSchema>;

export const suiteSchema = z.object({
  schemaVersion: z.literal(1),
  experiment: z.enum(["E1", "E2", "E3"]),
  environment: environmentSchema,
  config: z.object({
    sizes: z.array(z.number().int().positive()),
    runners: z.array(runnerIdSchema),
    warmups: z.number().int().nonnegative(),
    iterations: z.number().int().positive(),
  }),
  runs: z.array(runSchema),
  /** E2 only: cumulative latency per query count for each approach. */
  breakEven: z
    .array(
      z.object({
        queries: z.number().int().positive(),
        clientMs: z.number().nonnegative(),
        serverMs: z.number().nonnegative(),
      }),
    )
    .optional(),
});
export type Suite = z.infer<typeof suiteSchema>;
