// Copies the DuckDB-Wasm bundles into public/duckdb/<version>/ so they are served
// same-origin (required on cross-origin isolated routes, see docs/DECISIONS.md).
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

import { dirname, join } from "node:path";


const pkgPath = join(process.cwd(), "node_modules", "@duckdb", "duckdb-wasm", "package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const distDir = join(dirname(pkgPath), "dist");
const outDir = join(process.cwd(), "public", "duckdb", version);

const files = [
  "duckdb-mvp.wasm",
  "duckdb-eh.wasm",
  "duckdb-coi.wasm",
  "duckdb-browser-mvp.worker.js",
  "duckdb-browser-eh.worker.js",
  "duckdb-browser-coi.worker.js",
  "duckdb-browser-coi.pthread.worker.js",
];

mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const target = join(outDir, file);
  if (!existsSync(target)) copyFileSync(join(distDir, file), target);
}

// The version is also written to a generated module so the app can build URLs.
const genDir = join(process.cwd(), "src", "generated");
mkdirSync(genDir, { recursive: true });
writeFileSync(
  join(genDir, "duckdb-version.json"),
  JSON.stringify(
    {
      version,
      // Uncompressed bytes of each engine; shown to users before they load it.
      bytes: {
        mvp: statSync(join(outDir, "duckdb-mvp.wasm")).size,
        eh: statSync(join(outDir, "duckdb-eh.wasm")).size,
        coi: statSync(join(outDir, "duckdb-coi.wasm")).size,
      },
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(`DuckDB-Wasm ${version} assets ready in public/duckdb/${version}\n`);
