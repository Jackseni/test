import { describe, expect, it } from "vitest";
import { segmentProportions } from "@/lib/utils/segments";

const sum = (s: ReturnType<typeof segmentProportions>) => s.reduce((a, x) => a + x.percentTenths, 0);

describe("segmentProportions", () => {
  it("returns zero widths when all totals are zero", () => {
    const s = segmentProportions(0, 0, 0);
    expect(s.map((x) => x.percentTenths)).toEqual([0, 0, 0]);
  });
  it("keeps order income, expense, balance", () => {
    expect(segmentProportions(1, 1, 1).map((x) => x.key)).toEqual(["income", "expense", "balance"]);
  });
  it("splits proportionally and sums to 1000 tenths", () => {
    const s = segmentProportions(100000, 25000, 75000);
    expect(s.map((x) => x.percentTenths)).toEqual([500, 125, 375]);
    expect(sum(s)).toBe(1000);
  });
  it("gives the negative balance no width but keeps its cents", () => {
    const s = segmentProportions(100000, 150000, -50000);
    expect(s[2].percentTenths).toBe(0);
    expect(s[2].cents).toBe(-50000);
    expect(sum(s)).toBe(1000);
  });
  it("sums to exactly 1000 despite rounding (thirds)", () => {
    expect(sum(segmentProportions(1, 1, 1))).toBe(1000);
    expect(sum(segmentProportions(7, 13, 29))).toBe(1000);
  });
  it("handles income only", () => {
    const s = segmentProportions(5000, 0, 5000);
    expect(s.map((x) => x.percentTenths)).toEqual([500, 0, 500]);
  });
});
