import { describe, expect, it } from "vitest";
import { classify, scaleItems } from "@/components/hyetograph/scale";
import { chartable, toCsv } from "@/components/explorer/result";
import { getRegion, regions } from "@/config/regions";
import { routes } from "@/config/routes";
import { suiteSchema } from "@/lib/bench/result-schema";
import { mergeRegions } from "@/lib/socrata/queries";
import { parseResponse } from "@/lib/workers/protocol";

describe("hyetograph scale", () => {
  it("normalizes to the maximum and marks it", () => {
    const s = scaleItems([
      { label: "a", value: 50 },
      { label: "b", value: 100 },
      { label: "c", value: 0 },
    ]);
    expect(s.map((i) => i.pct)).toEqual([50, 100, 0]);
    expect(s.map((i) => i.isMax)).toEqual([false, true, false]);
  });

  it("assigns 7 ordered quantile classes", () => {
    const sorted = Array.from({ length: 14 }, (_, i) => i);
    expect(classify(0, sorted)).toBe(1);
    expect(classify(13, sorted)).toBe(7);
    const classes = sorted.map((v) => classify(v, sorted));
    expect([...classes].sort((a, b) => a - b)).toEqual(classes);
  });

  it("handles empty and non-finite values", () => {
    expect(scaleItems([])).toEqual([]);
    const z = scaleItems([
      { label: "a", value: 0 },
      { label: "b", value: Number.NaN },
    ]);
    expect(z.every((i) => i.pct === 0 && !i.isMax)).toBe(true);
  });
});

describe("schemas and helpers", () => {
  it("rejects malformed result suites", () => {
    expect(suiteSchema.safeParse({ schemaVersion: 1 }).success).toBe(false);
  });

  it("validates worker messages", () => {
    expect(parseResponse({ id: 1, type: "ready" })).toEqual({ id: 1, type: "ready" });
    expect(() => parseResponse({ id: 1, type: "nope" })).toThrow();
  });

  it("merges department spellings into one region", () => {
    const merged = mergeRegions(
      [
        { departamento: "NARIÑO", n: 10, v: 5 },
        { departamento: "NARINO", n: 5, v: 2 },
        { departamento: "Nariño", n: 5, v: 3 },
        { departamento: "UNKNOWN", n: 99, v: 1 },
      ],
      "sum",
    );
    expect(merged).toEqual([{ region: "Nariño", rows: 20, value: 10 }]);
  });

  it("region variants are unique", () => {
    const all = regions.flatMap((r) => r.variants);
    expect(new Set(all).size).toBe(all.length);
    expect(getRegion("bogota")?.variants).toContain("BOGOTA D.C.");
  });

  it("CSV export escapes quotes and commas", () => {
    const csv = toCsv({
      columns: [
        { name: "a", numeric: false },
        { name: "b", numeric: true },
      ],
      rows: [['x,"y"', 1]],
      totalRows: 1,
    });
    expect(csv).toBe('a,b\n"x,""y""",1\n');
  });

  it("detects chartable results", () => {
    const r = {
      columns: [
        { name: "m", numeric: true },
        { name: "v", numeric: true },
      ],
      rows: [
        [1, 2],
        [2, 3],
      ],
      totalRows: 2,
    };
    expect(chartable(r)).toHaveLength(2);
    expect(chartable({ ...r, columns: [r.columns[0]!] })).toBeNull();
  });

  it("ISR routes declare 3600 seconds", () => {
    for (const r of routes) if (r.pattern === "ISR") expect(r.revalidate).toBe(3600);
  });
});
