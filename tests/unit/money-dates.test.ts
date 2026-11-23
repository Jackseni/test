import { describe, expect, it } from "vitest";
import { daysInMonth, formatIsoDate, isValidIsoDate, monthRange, todayIso } from "@/lib/utils/dates";
import {
  centsToAmountString,
  centsToNumeric,
  formatCents,
  numericToCents,
  parseAmountToCents,
  sumCents,
} from "@/lib/utils/money";
import { buildPageInfo } from "@/lib/utils/pagination";
import {
  CATEGORY_IN_USE,
  CATEGORY_NOT_FOUND,
  CATEGORY_TYPE_MISMATCH,
  checkCategoryDeletable,
  checkCategoryForTransaction,
} from "@/lib/utils/transaction-rules";

describe("parseAmountToCents", () => {
  it.each([
    ["0", 0],
    ["1", 100],
    ["1.5", 150],
    ["1.05", 105],
    ["0.07", 7],
    ["12.34", 1234],
    ["999999999999.99", 99_999_999_999_999],
  ])("parses %s", (input, cents) => expect(parseAmountToCents(input)).toBe(cents));

  it.each(["", " ", "-1", "+1", "1.234", "1,50", "1e3", ".5", "1.", "abc", "1 000", "9999999999999", "1.2.3"])(
    "rejects %j",
    (input) => expect(parseAmountToCents(input)).toBeNull(),
  );

  it("is exact where floats are not (0.1 + 0.2)", () => {
    expect(sumCents([parseAmountToCents("0.1")!, parseAmountToCents("0.2")!])).toBe(30);
  });
});

describe("cents conversions", () => {
  it("round trips", () => {
    expect(centsToAmountString(1234)).toBe("12.34");
    expect(centsToAmountString(5)).toBe("0.05");
    expect(centsToNumeric(105)).toBe(1.05);
    expect(numericToCents(1.1)).toBe(110);
    expect(numericToCents(19.99)).toBe(1999);
    expect(numericToCents("0.29")).toBe(29);
  });

  it("formats currency with 2 decimals", () => {
    expect(formatCents(123456, "USD", "en-US")).toBe("$1,234.56");
    expect(formatCents(123456)).toMatch(/1,234\.56/);
  });
});

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2023-02-29")).toBe(false);
    expect(isValidIsoDate("2024-13-01")).toBe(false);
    expect(isValidIsoDate("2024-04-31")).toBe(false);
    expect(isValidIsoDate("2024-1-1")).toBe(false);
    expect(isValidIsoDate("hoy")).toBe(false);
  });

  it("computes month ranges as strings", () => {
    expect(monthRange(2024, 2)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(monthRange(2025, 12)).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it("uses local calendar date for today and formats for display", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(formatIsoDate("2026-03-05")).toBe("05/03/2026");
  });
});

describe("pagination and rules", () => {
  it("builds page info", () => {
    expect(buildPageInfo(3, 10, 25)).toMatchObject({ totalPages: 3, rangeFrom: 20, rangeTo: 29 });
    expect(buildPageInfo(1, 10, 0).totalPages).toBe(1);
  });

  it("checks category/type consistency", () => {
    expect(checkCategoryForTransaction(null, "INCOME")).toBe(CATEGORY_NOT_FOUND);
    expect(checkCategoryForTransaction({ type: "EXPENSE" }, "INCOME")).toBe(CATEGORY_TYPE_MISMATCH);
    expect(checkCategoryForTransaction({ type: "INCOME" }, "INCOME")).toBeNull();
  });

  it("blocks deleting categories in use", () => {
    expect(checkCategoryDeletable(2)).toBe(CATEGORY_IN_USE);
    expect(checkCategoryDeletable(0)).toBeNull();
  });
});
