/**
 * Generates src/generated/hero-hyetograph.json from IDEAM climatological normals
 * (dataset nsz2-kzcq on datos.gov.co). Run manually: `pnpm data:hero`.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const DATASET = "nsz2-kzcq";
const STATION_CODE = "21205791"; // Aeropuerto El Dorado Catam AUT, Bogotá
const PERIOD = "1991-2020";
const MONTH_FIELDS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const rowSchema = z.object({
  estaci_n: z.string(),
  municipio: z.string(),
  departamento: z.string(),
  periodo: z.string(),
  ...Object.fromEntries(MONTH_FIELDS.map((m) => [m, z.coerce.number()])),
  anual: z.coerce.number(),
});

async function main() {
  const where = `c_digo='${STATION_CODE}' AND periodo='${PERIOD}' AND par_metro='PRECIPITACIÓN'`;
  const url = `https://www.datos.gov.co/resource/${DATASET}.json?$where=${encodeURIComponent(where)}`;
  const headers: Record<string, string> = {};
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const rows = z.array(rowSchema).min(1).parse(await res.json());
  const row = rows[0]!;
  const record = row as unknown as Record<string, number>;
  const out = {
    sample: false,
    title: "Monthly rainfall normals",
    location: "Bogotá (El Dorado airport station)",
    period: row.periodo,
    unit: "mm",
    annual: row.anual,
    months: MONTH_FIELDS.map((m, i) => ({ label: MONTH_LABELS[i]!, value: record[m]! })),
    source: `IDEAM climatological normals, dataset ${DATASET} on datos.gov.co, station ${STATION_CODE}.`,
    sourceUrl: `https://www.datos.gov.co/d/${DATASET}`,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(
    join(process.cwd(), "src", "generated", "hero-hyetograph.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  process.stdout.write(`hero-hyetograph.json written (${out.location}, ${out.period})\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
