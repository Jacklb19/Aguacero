/** Plain result shape decoupled from Arrow so it can be tested and exported. */
export interface QueryResult {
  columns: { name: string; numeric: boolean }[];
  rows: unknown[][];
  totalRows: number;
}

export const RENDER_CAP = 1000;

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("en-US");
    return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  if (typeof v === "bigint") return v.toLocaleString("en-US");
  if (v instanceof Date) return v.toISOString().replace("T", " ").slice(0, 19);
  return String(v);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(result: QueryResult): string {
  const head = result.columns.map((c) => csvCell(c.name)).join(",");
  const body = result.rows.map((r) => r.map(csvCell).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

/**
 * A result can be drawn as hanging bars when it has exactly two columns, the second numeric,
 * and at most 60 rows (category or time on the first column).
 */
export function chartable(result: QueryResult): { label: string; value: number }[] | null {
  if (result.columns.length !== 2) return null;
  if (!result.columns[1]!.numeric) return null;
  if (result.rows.length < 2 || result.rows.length > 60) return null;
  const items = result.rows.map((r) => ({ label: formatCell(r[0]), value: Number(r[1]) }));
  if (items.some((i) => !Number.isFinite(i.value) || i.value < 0)) return null;
  return items;
}
