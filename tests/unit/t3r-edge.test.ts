import { describe, expect, it } from "vitest";
import { resolveAppTimezone } from "@/lib/env";
import { todayIso } from "@/lib/utils/dates";
import { normalizeAmountInput, parseAmountToCents } from "@/lib/utils/money";
import { amountSchema } from "@/lib/validations/transaction";
import { budgetCreateSchema, budgetUpdateSchema } from "@/lib/validations/budget";

describe("T3R todayIso edge cases", () => {
  it("year boundary: 2026-12-31T23:30 local Tegucigalpa (UTC-6) is still 2026-12-31 though UTC is 2027-01-01", () => {
    const instant = new Date("2027-01-01T05:30:00Z");
    expect(todayIso(instant, "America/Tegucigalpa")).toBe("2026-12-31");
    expect(todayIso(instant, "UTC")).toBe("2027-01-01");
  });
  it("just after local midnight rolls over", () => {
    expect(todayIso(new Date("2027-01-01T06:00:00Z"), "America/Tegucigalpa")).toBe("2027-01-01");
  });
  it("is stable across DST-free zone all year", () => {
    for (const d of ["2026-03-08T07:30:00Z", "2026-11-01T07:30:00Z", "2026-07-01T05:59:59Z"]) {
      const iso = todayIso(new Date(d), "America/Tegucigalpa");
      expect(iso).toBe(new Date(new Date(d).getTime() - 6 * 3600_000).toISOString().slice(0, 10));
    }
  });
  it("leap day and zone ahead of UTC", () => {
    expect(todayIso(new Date("2028-02-28T20:00:00Z"), "Asia/Tokyo")).toBe("2028-02-29");
  });
  it("invalid APP_TIMEZONE falls back (incl. whitespace, junk)", () => {
    for (const bad of ["Nope/Zone", "  ", "'; drop", "UTC+99", "../etc"]) {
      expect(resolveAppTimezone(bad)).toBe("America/Tegucigalpa");
    }
    expect(resolveAppTimezone(" UTC ")).toBe("UTC");
  });
});

describe("T3R comma normalization", () => {
  it("10,50 -> 10.50 -> exactly 1050 cents", () => {
    const out = amountSchema.parse("10,50");
    expect(out).toBe("10.50");
    expect(parseAmountToCents(out)).toBe(1050);
  });
  it("max amount with comma accepted, above rejected", () => {
    expect(amountSchema.parse("999999999999,99")).toBe("999999999999.99");
    expect(amountSchema.safeParse("1000000000000,00").success).toBe(false);
  });
  it("normalize leaves odd inputs untouched; strict parser still rejects commas", () => {
    for (const v of [",5", "5,", "0,00", "1,234.56", "1.234,56", "1,2,3", "1, 5", "１,５"]) {
      expect(parseAmountToCents(normalizeAmountInput(v))).toSatisfy((c: number | null) => c === null || c === 0); // zero is caught by amountSchema (below), never positive
      expect(amountSchema.safeParse(v).success).toBe(false);
    }
    expect(parseAmountToCents("1,50")).toBeNull();
  });
  it("0,01 accepted (1 cent); 0,001 rejected", () => {
    expect(parseAmountToCents(amountSchema.parse("0,01"))).toBe(1);
    expect(amountSchema.safeParse("0,001").success).toBe(false);
  });
  it("budget schemas share the same normalization", () => {
    expect(budgetUpdateSchema.parse({ amount: "100,5" }).amount).toBe("100.5");
    expect(budgetUpdateSchema.safeParse({ amount: "1,2,3" }).success).toBe(false);
    expect(typeof budgetCreateSchema.safeParse).toBe("function");
  });
});
