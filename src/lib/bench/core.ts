/**
 * Deterministic, integer-only synthetic workload (README §8.1).
 * Every runner must return bit-identical aggregates for the same N.
 */
export const GROUPS = 1000;
export const KEY_MUL = 7919;
export const VALUE_MUL = 104729;
export const VALUE_MOD = 10007;
export const CHECKSUM_P = 1_000_003;

export function keyAt(i: number): number {
  return (i * KEY_MUL) % GROUPS;
}

export function valueAt(i: number): number {
  return (i * VALUE_MUL) % VALUE_MOD;
}

/** Fills keys/values for rows [start, end). i*104729 stays below 2^53 for N <= 10^10. */
export function generateInto(keys: Int32Array, values: Int32Array, start: number, end: number) {
  for (let i = start; i < end; i++) {
    keys[i] = (i * KEY_MUL) % GROUPS;
    values[i] = (i * VALUE_MUL) % VALUE_MOD;
  }
}

export function generate(n: number): { keys: Int32Array; values: Int32Array } {
  const keys = new Int32Array(n);
  const values = new Int32Array(n);
  generateInto(keys, values, 0, n);
  return { keys, values };
}

/** Per-group partials: count, sum, min, max (flat typed arrays). */
export interface Partials {
  count: Float64Array;
  sum: Float64Array;
  min: Float64Array;
  max: Float64Array;
}

export function emptyPartials(): Partials {
  return {
    count: new Float64Array(GROUPS),
    sum: new Float64Array(GROUPS),
    min: new Float64Array(GROUPS).fill(Number.POSITIVE_INFINITY),
    max: new Float64Array(GROUPS).fill(Number.NEGATIVE_INFINITY),
  };
}

/** Aggregates rows [from, to) into `into` (or new partials). */
export function aggregate(
  keys: ArrayLike<number>,
  values: ArrayLike<number>,
  from = 0,
  to = keys.length,
  into: Partials = emptyPartials(),
): Partials {
  const { count, sum, min, max } = into;
  for (let i = from; i < to; i++) {
    const k = keys[i]!;
    const v = values[i]!;
    count[k]! += 1;
    sum[k]! += v;
    if (v < min[k]!) min[k] = v;
    if (v > max[k]!) max[k] = v;
  }
  return into;
}

export function mergePartials(parts: Partials[]): Partials {
  const out = emptyPartials();
  for (const p of parts) {
    for (let g = 0; g < GROUPS; g++) {
      out.count[g]! += p.count[g]!;
      out.sum[g]! += p.sum[g]!;
      if (p.min[g]! < out.min[g]!) out.min[g] = p.min[g]!;
      if (p.max[g]! > out.max[g]!) out.max[g] = p.max[g]!;
    }
  }
  return out;
}

/** checksum = (Σ_g (g+1) * (sum_g % P)) % P, exact in doubles. */
export function checksum(p: Pick<Partials, "sum">): number {
  let acc = 0;
  for (let g = 0; g < GROUPS; g++) {
    const s = p.sum[g] ?? 0;
    acc = (acc + (((g + 1) * (s % CHECKSUM_P)) % CHECKSUM_P)) % CHECKSUM_P;
  }
  return acc;
}

/** Full computation used by the `main` and `server` runners. */
export function computeAll(n: number): { partials: Partials; checksum: number } {
  const { keys, values } = generate(n);
  const partials = aggregate(keys, values);
  return { partials, checksum: checksum(partials) };
}

/** Aggregation that generates on the fly (no arrays); a cross-check for tests. */
export function computeStreaming(n: number): Partials {
  const out = emptyPartials();
  for (let i = 0; i < n; i++) {
    const k = keyAt(i);
    const v = valueAt(i);
    out.count[k]! += 1;
    out.sum[k]! += v;
    if (v < out.min[k]!) out.min[k] = v;
    if (v > out.max[k]!) out.max[k] = v;
  }
  return out;
}

export function duckdbWorkloadSql(n: number): { setup: string; query: string } {
  const rows = Math.floor(n);
  return {
    setup: `CREATE OR REPLACE TABLE bench AS SELECT ((i * ${KEY_MUL}) % ${GROUPS})::INTEGER AS k, ((i * ${VALUE_MUL}) % ${VALUE_MOD})::INTEGER AS v FROM range(${rows}) t(i);`,
    query:
      "SELECT k, count(*)::DOUBLE AS c, sum(v)::DOUBLE AS s, min(v)::DOUBLE AS mn, max(v)::DOUBLE AS mx FROM bench GROUP BY k ORDER BY k;",
  };
}
