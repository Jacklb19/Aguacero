/** Benchmark harness (README §8.3): warm-ups, measured runs, random runner order. */
import type { BenchEnvironment, Run, RunnerId, Suite } from "./result-schema";
import { computeAll } from "./core";
import { nextFrame, ResponsivenessMonitor } from "./responsiveness";
import {
  duckdbRunner,
  mainRunner,
  poolRunner,
  serverRunner,
  workerRunner,
  type Runner,
} from "./runners";
import { shuffle } from "./stats";

export interface HarnessConfig {
  sizes: number[];
  runners: RunnerId[];
  warmups: number;
  iterations: number;
}

export interface HarnessCallbacks {
  onRun(run: Run): void;
  onProgress(done: number, total: number, label: string): void;
  onSkip(runner: RunnerId, reason: string): void;
  onDuckdbBundle?(bundle: string): void;
  signal: AbortSignal;
}

async function createRunner(id: RunnerId): Promise<Runner & { engine?: { bundle: string } }> {
  switch (id) {
    case "main":
      return mainRunner();
    case "worker-copy":
      return workerRunner("copy");
    case "worker-transfer":
      return workerRunner("transfer");
    case "worker-pool-sab":
      return poolRunner();
    case "duckdb-st":
      return duckdbRunner(false);
    case "duckdb-mt":
      return duckdbRunner(true);
    case "server":
      return serverRunner();
  }
}

/** Estimated peak bytes: two Int32Arrays, doubled for copies. */
export function estimatedBytes(rows: number): number {
  return rows * 8 * 2;
}

export function memoryLimitBytes(): number {
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  // Use at most an eighth of the reported memory; 1 GB when the browser does not say.
  return dm ? (dm * 1024 ** 3) / 8 : 1024 ** 3;
}

export async function runSuite(config: HarnessConfig, cb: HarnessCallbacks): Promise<Run[]> {
  const runs: Run[] = [];
  const limit = memoryLimitBytes();
  const sizes = config.sizes.filter((s) => {
    if (estimatedBytes(s) > limit) {
      cb.onSkip("main", `${s} rows skipped: too large for this device's memory.`);
      return false;
    }
    return true;
  });
  // The reference checksum per size is the main runner's computation, done up front.
  const reference = new Map<number, number>();
  for (const s of sizes) reference.set(s, computeAll(s).checksum);

  const order = shuffle(config.runners);
  const perRunner = config.warmups + config.iterations;
  const total = order.length * sizes.length * perRunner;
  let done = 0;

  for (const id of order) {
    if (cb.signal.aborted) break;
    let runner: Runner & { engine?: { bundle: string } };
    try {
      cb.onProgress(done, total, `Preparing ${id}`);
      runner = await createRunner(id);
      if (runner.engine) cb.onDuckdbBundle?.(runner.engine.bundle);
    } catch (err) {
      cb.onSkip(id, err instanceof Error ? err.message : String(err));
      done += sizes.length * perRunner;
      continue;
    }
    try {
      for (const rows of sizes) {
        if (id === "server" && rows > 5_000_000) {
          cb.onSkip(id, "The server accepts at most 5,000,000 rows.");
          done += perRunner;
          continue;
        }
        for (let i = 0; i < perRunner; i++) {
          if (cb.signal.aborted) break;
          await nextFrame();
          const monitor = new ResponsivenessMonitor();
          monitor.start();
          const m = await runner.run(rows);
          const resp = monitor.stop();
          const run: Run = {
            runner: id,
            rows,
            iteration: i,
            warmup: i < config.warmups,
            setupMs: m.setupMs,
            computeMs: m.computeMs,
            totalMs: m.totalMs,
            bytesMoved: m.bytesMoved,
            mainThreadBlockedMs: resp.blockedMs,
            peakFrameGapMs: resp.peakFrameGapMs,
            checksum: m.checksum,
            checksumOk: m.checksum === reference.get(rows),
          };
          runs.push(run);
          cb.onRun(run);
          done++;
          cb.onProgress(done, total, `${id}, ${rows} rows`);
        }
      }
    } catch (err) {
      cb.onSkip(id, err instanceof Error ? err.message : String(err));
    } finally {
      await runner.dispose();
    }
  }
  return runs;
}

export function buildSuite(
  config: HarnessConfig,
  runs: Run[],
  environment: BenchEnvironment,
): Suite {
  return { schemaVersion: 1, experiment: "E1", environment, config, runs };
}
