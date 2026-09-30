import { describe, expect, it } from "vitest";
import { quantile, shuffle, summarize } from "@/lib/bench/stats";

describe("stats", () => {
  it("computes type-7 quantiles", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
  });

  it("summarizes and flags outliers without dropping them", () => {
    const s = summarize([10, 11, 12, 10, 11, 12, 100]);
    expect(s.n).toBe(7);
    expect(s.median).toBe(11);
    expect(s.min).toBe(10);
    expect(s.outliers).toEqual([6]);
  });

  it("shuffle keeps every item", () => {
    expect(shuffle([1, 2, 3, 4], () => 0.5).sort()).toEqual([1, 2, 3, 4]);
  });
});
