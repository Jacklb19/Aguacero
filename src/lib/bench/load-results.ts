import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { suiteSchema, type Suite } from "./result-schema";

export interface LoadedSuite {
  file: string;
  suite: Suite;
}

/** Reads and validates committed result files at build time. Invalid files fail the build. */
export function loadResults(dir = join(process.cwd(), "data", "results")): LoadedSuite[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return files.sort().map((file) => {
    const raw: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const parsed = suiteSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid result file ${file}: ${parsed.error.message}`);
    }
    return { file, suite: parsed.data };
  });
}
