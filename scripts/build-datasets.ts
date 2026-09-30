/**
 * ETL: downloads a bounded slice of each dataset from datos.gov.co and writes a sorted,
 * ZSTD-compressed Parquet file per dataset plus a metadata file (README §7.3).
 *
 * Run manually, never at deploy:  pnpm data:build
 * Options (env): DAYS_PRECIPITATION (default 30), DAYS_AIR_TEMPERATURE (default 60).
 */
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DuckDBInstance } from "@duckdb/node-api";
import { datasets, type DatasetSpec } from "../src/config/datasets";
import { regions } from "../src/config/regions";

const ROOT = process.cwd();
const CACHE = join(ROOT, ".cache", "etl");
const PUBLIC_DATA = join(ROOT, "public", "data");
const GENERATED = join(ROOT, "src", "generated");
const PAGE = 500_000;
const COLUMNS = [
  "codigoestacion",
  "nombreestacion",
  "departamento",
  "municipio",
  "fechaobservacion",
  "valorobservado",
  "latitud",
  "longitud",
];

const log = (msg: string) => process.stdout.write(`${msg}\n`);

function daysFor(d: DatasetSpec): number {
  const key = `DAYS_${d.slug.toUpperCase().replace(/-/g, "_")}`;
  const fallback = d.slug === "precipitation" ? 30 : 60;
  return Number(process.env[key] ?? fallback);
}

async function download(d: DatasetSpec, since: string): Promise<string[]> {
  const dir = join(CACHE, d.slug);
  // REUSE_CACHE=1 reuses a previous download (useful when only the conversion changed).
  if (process.env.REUSE_CACHE === "1" && existsSync(dir)) {
    const cached = readdirSync(dir).filter((f) => f.endsWith(".csv")).sort().map((f) => join(dir, f));
    if (cached.length > 0) {
      log(`  ${d.slug}: reusing ${cached.length} cached pages`);
      return cached;
    }
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const headers: Record<string, string> = {};
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  const files: string[] = [];
  for (let page = 0; ; page++) {
    const params = new URLSearchParams({
      $select: COLUMNS.join(","),
      $where: `fechaobservacion >= '${since}'`,
      $order: ":id",
      $limit: String(PAGE),
      $offset: String(page * PAGE),
    });
    const url = `https://www.datos.gov.co/resource/${d.id}.csv?${params.toString()}`;
    const file = join(dir, `page-${String(page).padStart(3, "0")}.csv`);
    let attempt = 0;
    for (;;) {
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(600_000) });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file));
        break;
      } catch (err) {
        if (++attempt > 3) throw err;
        log(`  retry page ${page} (${String(err)})`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    const lines = readFileSync(file, "utf8").split("\n").filter(Boolean).length - 1;
    log(`  ${d.slug}: page ${page}, ${lines} rows`);
    if (lines <= 0) {
      rmSync(file);
      break;
    }
    files.push(file);
    if (lines < PAGE) break;
  }
  if (files.length === 0) throw new Error(`No rows downloaded for ${d.slug}`);
  return files;
}

function sqlString(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

async function build(d: DatasetSpec) {
  const days = daysFor(d);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) + "T00:00:00";
  log(`${d.slug}: downloading readings since ${since}`);
  const files = await download(d, since);

  const instance = await DuckDBInstance.create(":memory:");
  const conn = await instance.connect();
  const mapping = regions
    .flatMap((r) => r.variants.map((v) => `(${sqlString(v)}, ${sqlString(r.name)})`))
    .join(",\n");
  await conn.run(`CREATE TABLE region_map(raw VARCHAR, name VARCHAR); INSERT INTO region_map VALUES ${mapping};`);
  const csvList = files.map((f) => sqlString(f.replace(/\\/g, "/"))).join(", ");
  await conn.run(`
    CREATE TABLE raw AS SELECT * FROM read_csv([${csvList}], header = true, all_varchar = true);
  `);
  // Normalize: typed columns, local time kept as TIMESTAMP (upstream has no offset, UTC-5),
  // trimmed strings, canonical department names, invalid numbers dropped.
  await conn.run(`
    CREATE TABLE clean AS
    SELECT
      try_strptime(fechaobservacion, '%Y-%m-%dT%H:%M:%S.%g') AS observed_at,
      trim(codigoestacion) AS station_code,
      trim(regexp_replace(nombreestacion, '\\s+', ' ', 'g')) AS station,
      coalesce(m.name, trim(departamento)) AS department,
      trim(municipio) AS municipality,
      try_cast(valorobservado AS DOUBLE) AS value,
      try_cast(latitud AS DOUBLE) AS latitude,
      try_cast(longitud AS DOUBLE) AS longitude
    FROM raw LEFT JOIN region_map m ON m.raw = trim(raw.departamento)
    WHERE try_cast(valorobservado AS DOUBLE) IS NOT NULL
      AND try_strptime(fechaobservacion, '%Y-%m-%dT%H:%M:%S.%g') IS NOT NULL;
  `);
  const countReader = await conn.runAndReadAll(
    "SELECT count(*)::BIGINT AS n, min(observed_at)::VARCHAR AS a, max(observed_at)::VARCHAR AS b FROM clean",
  );
  const [n, minTs, maxTs] = countReader.getRows()[0] as [bigint, string, string];
  if (Number(n) === 0) throw new Error(`${d.slug}: no valid rows after cleaning`);

  mkdirSync(PUBLIC_DATA, { recursive: true });
  const tmp = join(PUBLIC_DATA, `${d.slug}.tmp.parquet`).replace(/\\/g, "/");
  await conn.run(
    `COPY (SELECT * FROM clean ORDER BY department, observed_at) TO ${sqlString(tmp)} (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 122880);`,
  );
  const hash = createHash("sha256").update(readFileSync(tmp)).digest("hex").slice(0, 10);
  const finalName = `${d.slug}.${hash}.parquet`;
  for (const old of readdirSync(PUBLIC_DATA)) {
    if (/^[\w-]+\.[0-9a-f]{10}\.parquet$/.test(old) && old.startsWith(`${d.slug}.`) && old !== finalName) {
      rmSync(join(PUBLIC_DATA, old));
    }
  }
  const finalPath = join(PUBLIC_DATA, finalName);
  if (existsSync(finalPath)) rmSync(finalPath);
  renameSync(tmp, finalPath);
  const bytes = statSync(finalPath).size;

  const meta = {
    slug: d.slug,
    id: d.id,
    file: `/data/${finalName}`,
    rows: Number(n),
    bytes,
    from: minTs,
    to: maxTs,
    days,
    generatedAt: new Date().toISOString(),
    sourceUrl: d.sourceUrl,
    license: d.license.name,
    columns: [
      { name: "observed_at", type: "TIMESTAMP", description: "Local time of the reading (UTC-5)." },
      { name: "station_code", type: "VARCHAR", description: "IDEAM station code." },
      { name: "station", type: "VARCHAR", description: "Station name." },
      { name: "department", type: "VARCHAR", description: "Department, spelling normalized." },
      { name: "municipality", type: "VARCHAR", description: "Municipality." },
      { name: "value", type: "DOUBLE", description: `${d.measure} (${d.unit}).` },
      { name: "latitude", type: "DOUBLE", description: "Decimal degrees." },
      { name: "longitude", type: "DOUBLE", description: "Decimal degrees." },
    ],
  };
  mkdirSync(GENERATED, { recursive: true });
  writeFileSync(join(GENERATED, `${d.slug}.meta.json`), JSON.stringify(meta, null, 2) + "\n");
  // Index read by the explorer (src/lib/data-files.ts).
  const indexPath = join(GENERATED, "data-files.json");
  const index: Record<string, unknown> = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, "utf8")) as Record<string, unknown>)
    : {};
  index[d.slug] = meta;
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
  log(`${d.slug}: ${meta.rows} rows, ${(bytes / 1024 / 1024).toFixed(1)} MB -> ${meta.file}`);
  conn.closeSync();
}

async function main() {
  const only = process.argv[2];
  for (const d of datasets) {
    if (only && d.slug !== only) continue;
    await build(d);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
