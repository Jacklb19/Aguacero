import { describe, expect, it } from "vitest";
import { datasets } from "@/config/datasets";
import {
  assertColumn,
  inList,
  literal,
  SoqlError,
  timestamp,
  toSearchParams,
} from "@/lib/socrata/soql";

const d = datasets[0]!;

describe("SoQL builder", () => {
  it("escapes quotes in literals", () => {
    expect(literal("O'Neil")).toBe("'O''Neil'");
    expect(literal("x' OR '1'='1")).toBe("'x'' OR ''1''=''1'");
  });

  it("rejects control characters", () => {
    expect(() => literal("a\u0000b")).toThrow(SoqlError);
  });

  it("whitelists columns", () => {
    expect(assertColumn(d, "departamento")).toBe("departamento");
    expect(() => assertColumn(d, "departamento; DROP")).toThrow(SoqlError);
    expect(() => assertColumn(d, "password")).toThrow(SoqlError);
  });

  it("builds IN lists", () => {
    expect(inList(d, "departamento", ["NARIÑO", "O'X"])).toBe(
      "departamento IN ('NARIÑO', 'O''X')",
    );
    expect(() => inList(d, "departamento", [])).toThrow(SoqlError);
  });

  it("formats floating timestamps", () => {
    expect(timestamp(new Date("2026-09-01T05:00:00Z"))).toBe("'2026-09-01T05:00:00'");
    expect(() => timestamp(new Date("nope"))).toThrow(SoqlError);
  });

  it("validates limits", () => {
    expect(toSearchParams({ limit: 10 }).get("$limit")).toBe("10");
    expect(() => toSearchParams({ limit: 0 })).toThrow(SoqlError);
    expect(() => toSearchParams({ limit: 1.5 })).toThrow(SoqlError);
  });
});
