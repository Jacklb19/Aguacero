/** Linear-interpolated quantile (type 7, the R and NumPy default). */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  return a + (b - a) * (pos - lo);
}

export interface Summary {
  n: number;
  median: number;
  p95: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  /** Indices (into the input) of values beyond 1.5 IQR from the quartiles. Flagged, not dropped. */
  outliers: number[];
}

export function summarize(values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return {
    n: values.length,
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    min: sorted[0] ?? Number.NaN,
    max: sorted[sorted.length - 1] ?? Number.NaN,
    q1,
    q3,
    iqr,
    outliers: values.flatMap((v, i) => (v < lo || v > hi ? [i] : [])),
  };
}

/** Fisher-Yates shuffle with an injectable random source (for tests). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
