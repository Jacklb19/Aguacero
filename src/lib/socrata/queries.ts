import "server-only";
import { z } from "zod";
import { ISR_SECONDS } from "@/config/routes";
import type { DatasetSpec } from "@/config/datasets";
import type { Region } from "@/config/regions";
import { regions } from "@/config/regions";
import { socrataGet, resourcePath, UpstreamError, type CacheMode } from "./client";
import { inList, timestamp } from "./soql";

const num = z.coerce.number().refine(Number.isFinite, "not a finite number");

const isr = (d: DatasetSpec): CacheMode => ({
  kind: "isr",
  revalidate: ISR_SECONDS,
  tags: ["datasets", `dataset:${d.slug}`],
});

// ---------------------------------------------------------------- catalog

const viewSchema = z.object({
  id: z.string(),
  name: z.string(),
  rowsUpdatedAt: z.number().int().positive(),
  viewLastModified: z.number().int().optional(),
});


export interface CatalogEntry {
  dataset: DatasetSpec;
  upstreamName: string;
  rows: number;
  updatedAt: string;
}

export async function getCatalogEntry(d: DatasetSpec): Promise<CatalogEntry> {
  const [view, years] = await Promise.all([
    socrataGet(`/api/views/${d.id}.json`, viewSchema, isr(d)),
    getRowsPerYear(d),
  ]);
  if (view.id !== d.id) throw new UpstreamError(`Unexpected dataset ${view.id}`);
  // A full count(*) takes ~45 s upstream; the per-year query is shared with the dataset page.
  const rows = years.reduce((a, b) => a + b.rows, 0);
  if (rows <= 0) throw new UpstreamError(`Empty dataset ${d.id}`);
  return {
    dataset: d,
    upstreamName: view.name,
    rows,
    updatedAt: new Date(view.rowsUpdatedAt * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------- dataset summary

const yearRows = z
  .array(z.object({ y: num, n: num }))
  .min(1, "no yearly rows");

const deptRows = z.array(z.object({ departamento: z.string().optional(), n: num, v: num }));

export interface DatasetSummary {
  perYear: { year: number; rows: number }[];
  /** Readings per region over the window, with the aggregated measure. */
  perRegion: { region: string; rows: number; value: number }[];
  windowDays: number;
  windowStart: string;
}

/** Maps upstream department spellings onto our regions and merges them. */
export function mergeRegions(
  rows: { departamento?: string | undefined; n: number; v: number }[],
  how: "sum" | "avg",
): { region: string; rows: number; value: number }[] {
  const acc = new Map<string, { rows: number; total: number }>();
  for (const r of rows) {
    if (!r.departamento) continue;
    const region = regions.find((reg) => reg.variants.includes(r.departamento!));
    if (!region) continue;
    const cur = acc.get(region.name) ?? { rows: 0, total: 0 };
    cur.rows += r.n;
    // For averages, v is a per-department mean: weight it by row count.
    cur.total += how === "sum" ? r.v : r.v * r.n;
    acc.set(region.name, cur);
  }
  return [...acc.entries()]
    .map(([region, { rows, total }]) => ({
      region,
      rows,
      value: how === "sum" ? total : total / rows,
    }))
    .sort((a, b) => b.rows - a.rows);
}

/** Readings per year. Same URL as used by the dataset page, so the Data Cache dedupes it. */
export async function getRowsPerYear(d: DatasetSpec): Promise<{ year: number; rows: number }[]> {
  const years = await socrataGet(
    resourcePath(d.id, {
      select: "date_extract_y(fechaobservacion) AS y, count(*) AS n",
      group: "y",
      order: "y",
    }),
    yearRows,
    isr(d),
    { timeoutMs: 150_000, retries: 1 },
  );
  return years.map((r) => ({ year: r.y, rows: r.n }));
}

export async function getDatasetSummary(
  d: DatasetSpec,
  now: Date,
  windowDays = 30,
): Promise<DatasetSummary> {
  const start = new Date(now.getTime() - windowDays * 86_400_000);
  const agg = d.monthlyAggregate === "sum" ? "sum" : "avg";
  const [perYear, depts] = await Promise.all([
    getRowsPerYear(d),
    socrataGet(
      resourcePath(d.id, {
        select: `departamento, count(*) AS n, ${agg}(valorobservado) AS v`,
        where: `fechaobservacion >= ${timestamp(start)}`,
        group: "departamento",
        limit: 500,
      }),
      deptRows,
      isr(d),
      { timeoutMs: 150_000, retries: 1 },
    ),
  ]);
  const perRegion = mergeRegions(depts, d.monthlyAggregate);
  if (perRegion.length === 0) throw new UpstreamError(`No recent regional data for ${d.id}`);
  return {
    perYear,
    perRegion,
    windowDays,
    windowStart: start.toISOString(),
  };
}

// ---------------------------------------------------------------- region (SSR)

const stationDayRows = z.array(
  z.object({ d: z.string(), s: z.string(), v: num, n: num }),
);

export interface RegionFigures {
  region: Region;
  dataset: DatasetSpec;
  /** Per day: mean over reporting stations of each station's daily total (rain) or mean (temp). */
  days: { date: string; value: number; stations: number }[];
  /** Rain: sum of daily values. Temperature: mean of daily values. */
  total: number;
  stations: number;
  readings: number;
  windowStart: string;
}

/** Fresh daily figures for one region. Never cached (SSR). */
export async function getRegionFigures(
  d: DatasetSpec,
  region: Region,
  now: Date,
  windowDays = 14,
): Promise<RegionFigures> {
  const start = new Date(now.getTime() - windowDays * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  const agg = d.monthlyAggregate === "sum" ? "sum" : "avg";
  const rows = await socrataGet(
    resourcePath(d.id, {
      select: `date_trunc_ymd(fechaobservacion) AS d, codigoestacion AS s, ${agg}(valorobservado) AS v, count(*) AS n`,
      where: `${inList(d, "departamento", region.variants)} AND fechaobservacion >= ${timestamp(start)}`,
      group: "d, s",
      order: "d",
      limit: 50_000,
    }),
    stationDayRows,
    { kind: "no-store" },
    { timeoutMs: 90_000, retries: 1 },
  );
  const byDay = new Map<string, { total: number; stations: number }>();
  const stationSet = new Set<string>();
  let readings = 0;
  for (const r of rows) {
    const date = r.d.slice(0, 10);
    const cur = byDay.get(date) ?? { total: 0, stations: 0 };
    cur.total += r.v;
    cur.stations += 1;
    byDay.set(date, cur);
    stationSet.add(r.s);
    readings += r.n;
  }
  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, stations }]) => ({ date, value: total / stations, stations }));
  const total =
    d.monthlyAggregate === "sum"
      ? days.reduce((a, b) => a + b.value, 0)
      : days.reduce((a, b) => a + b.value, 0) / Math.max(1, days.length);
  return {
    region,
    dataset: d,
    days,
    total,
    stations: stationSet.size,
    readings,
    windowStart: start.toISOString(),
  };
}
