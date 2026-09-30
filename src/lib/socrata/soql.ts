/**
 * Tiny typed SoQL builder. Column names are whitelisted against the dataset registry and
 * values are escaped, so user input can never be interpolated raw (README §7.2).
 */
import type { DatasetSpec } from "@/config/datasets";

export class SoqlError extends Error {}

const IDENT = /^[a-z_][a-z0-9_]*$/;

export function assertColumn(dataset: DatasetSpec, column: string): string {
  if (!IDENT.test(column) || !dataset.columns.some((c) => c.field === column)) {
    throw new SoqlError(`Column not allowed: ${column}`);
  }
  return column;
}

/** Escapes a string literal for SoQL (single quotes doubled). Rejects control characters. */
export function literal(value: string): string {
  if (/[\u0000-\u001f]/.test(value)) throw new SoqlError("Control characters are not allowed");
  return `'${value.replace(/'/g, "''")}'`;
}

/** Floating timestamp literal: 'YYYY-MM-DDTHH:MM:SS' (no zone; upstream stores local time). */
export function timestamp(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new SoqlError("Invalid date");
  return literal(date.toISOString().slice(0, 19));
}

export function inList(dataset: DatasetSpec, column: string, values: readonly string[]): string {
  if (values.length === 0) throw new SoqlError("Empty IN list");
  return `${assertColumn(dataset, column)} IN (${values.map(literal).join(", ")})`;
}

export interface SoqlQuery {
  select?: string;
  where?: string;
  group?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

export function toSearchParams(q: SoqlQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.select) p.set("$select", q.select);
  if (q.where) p.set("$where", q.where);
  if (q.group) p.set("$group", q.group);
  if (q.order) p.set("$order", q.order);
  if (q.limit !== undefined) {
    if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 50_000) {
      throw new SoqlError("Limit out of range");
    }
    p.set("$limit", String(q.limit));
  }
  if (q.offset !== undefined) {
    if (!Number.isInteger(q.offset) || q.offset < 0) throw new SoqlError("Offset out of range");
    p.set("$offset", String(q.offset));
  }
  return p;
}
