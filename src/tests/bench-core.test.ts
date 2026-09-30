import { describe, expect, it } from "vitest";
import {
  aggregate,
  checksum,
  computeAll,
  computeStreaming,
  emptyPartials,
  generate,
  GROUPS,
  mergePartials,
} from "@/lib/bench/core";

describe("synthetic workload", () => {
  it("generates the documented keys and values", () => {
    const { keys, values } = generate(3);
    expect([...keys]).toEqual([0, 919, 838]);
    expect([...values]).toEqual([0, 104729 % 10007, (2 * 104729) % 10007]);
  });

  it("covers all groups with the right counts", () => {
    const { partials } = computeAll(100_000);
    expect(partials.count.reduce((a, b) => a + b, 0)).toBe(100_000);
    for (let g = 0; g < GROUPS; g++) expect(partials.count[g]).toBe(100);
  });

  it("array and streaming aggregation agree", () => {
    const a = computeAll(50_000).partials;
    const b = computeStreaming(50_000);
    expect([...a.sum]).toEqual([...b.sum]);
    expect([...a.min]).toEqual([...b.min]);
    expect([...a.max]).toEqual([...b.max]);
  });

  it("merging disjoint slices equals one pass", () => {
    const { keys, values } = generate(30_001);
    const parts = [0, 1, 2].map((i) =>
      aggregate(keys, values, i * 10_001, Math.min(30_001, (i + 1) * 10_001), emptyPartials()),
    );
    expect(checksum(mergePartials(parts))).toBe(computeAll(30_001).checksum);
  });

  it("checksum is stable and sensitive to N", () => {
    expect(computeAll(100_000).checksum).toBe(computeAll(100_000).checksum);
    expect(computeAll(100_000).checksum).not.toBe(computeAll(100_001).checksum);
  });
});
