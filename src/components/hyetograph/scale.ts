export interface HyetoItem {
  label: string;
  value: number;
}

export interface ScaledItem extends HyetoItem {
  /** Height as a percentage of the tallest bar, 0..100. */
  pct: number;
  /** Sequential palette class, 1..7. */
  cls: number;
  isMax: boolean;
}

/** Quantile thresholds splitting the value range into `classes` steps (equal-interval on rank). */
export function classify(value: number, sortedValues: number[], classes = 7): number {
  const n = sortedValues.length;
  if (n === 0) return 1;
  if (n === 1) return classes;
  let below = 0;
  for (const v of sortedValues) if (v < value) below++;
  const q = below / (n - 1);
  return Math.min(classes, Math.max(1, Math.floor(q * classes) + 1));
}

export function scaleItems(items: HyetoItem[], classes = 7): ScaledItem[] {
  const finite = items.map((i) => (Number.isFinite(i.value) ? Math.max(0, i.value) : 0));
  const max = Math.max(0, ...finite);
  const sorted = [...finite].sort((a, b) => a - b);
  let maxIndex = -1;
  finite.forEach((v, idx) => {
    if (max > 0 && v === max && maxIndex === -1) maxIndex = idx;
  });
  return items.map((item, idx) => {
    const v = finite[idx] ?? 0;
    return {
      ...item,
      pct: max > 0 ? (v / max) * 100 : 0,
      cls: max > 0 ? classify(v, sorted, classes) : 1,
      isMax: idx === maxIndex,
    };
  });
}
