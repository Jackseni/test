import { describe, expect, it } from "vitest";
import { resolveAppTimezone } from "@/lib/env";
import { todayIso } from "@/lib/utils/dates";
import { normalizeAmountInput } from "@/lib/utils/money";
import { categoryCreateSchema } from "@/lib/validations/category";
import { amountSchema, transactionInputSchema } from "@/lib/validations/transaction";

describe("todayIso with time zone", () => {
  const instant = new Date("2026-03-01T03:00:00Z");
  it("uses the given zone", () => {
    expect(todayIso(instant, "America/Tegucigalpa")).toBe("2026-02-28");
    expect(todayIso(instant, "UTC")).toBe("2026-03-01");
  });
  it("defaults to America/Tegucigalpa", () => {
    expect(todayIso(instant)).toBe("2026-02-28");
  });
});

describe("resolveAppTimezone", () => {
  it("accepts valid, falls back on invalid/empty", () => {
    expect(resolveAppTimezone("UTC")).toBe("UTC");
    expect(resolveAppTimezone("Nope/Zone")).toBe("America/Tegucigalpa");
    expect(resolveAppTimezone("")).toBe("America/Tegucigalpa");
    expect(resolveAppTimezone(undefined)).toBe("America/Tegucigalpa");
  });
});

describe("decimal comma amounts", () => {
  it("normalizes a single comma to a dot", () => {
    expect(normalizeAmountInput(" 10,50 ")).toBe("10.50");
    expect(amountSchema.parse("10,50")).toBe("10.50");
    expect(amountSchema.parse("10.5")).toBe("10.5");
    expect(amountSchema.parse("7,5")).toBe("7.5");
  });
  it.each(["1,234.56", "1.234,56", "1,2,3", "-1,5", "+1,5", "1e3", "10,505", "1234567890123,50", ",50", "10,", "0,00"])(
    "rejects %s",
    (v) => {
      expect(amountSchema.safeParse(v).success).toBe(false);
    },
  );
  it("gives a helpful Spanish message", () => {
    expect(amountSchema.safeParse("abc").error?.issues[0].message).toContain("10,50");
  });
});

describe("NUL rejection", () => {
  it("rejects NUL in description and category name", () => {
    const base = {
      type: "EXPENSE",
      categoryId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      amount: "1",
      transactionDate: "2026-01-01",
    };
    expect(transactionInputSchema.safeParse({ ...base, description: "a\u0000b" }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...base, description: "ab" }).success).toBe(true);
    expect(categoryCreateSchema.safeParse({ name: "a\u0000", type: "EXPENSE", color: "#10b981" }).success).toBe(false);
  });
});
