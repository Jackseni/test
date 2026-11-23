import { describe, expect, it } from "vitest";
import {
  aggregateByMonth,
  allocatePercentTenths,
  formatPercentTenths,
  lastMonthKeys,
  monthKeyLabel,
  monthKeysBetween,
  sumExpensesByCategory,
  totalsForMonth,
  totalsOf,
  type AggRow,
} from "@/lib/utils/aggregation";
import { computeBudgetConsumption } from "@/lib/utils/budget-status";
import { budgetCreateSchema, budgetUpdateSchema, parseBudgetPeriod } from "@/lib/validations/budget";
import { parseReportRange } from "@/lib/validations/report";

const row = (type: AggRow["type"], amount: number, date: string, cat = "c1"): AggRow => ({
  type,
  amount,
  transaction_date: date,
  category_id: cat,
});

describe("cents aggregation", () => {
  it("sums without floating point drift", () => {
    const rows = Array.from({ length: 10 }, () => row("EXPENSE", 0.1, "2026-03-01"));
    rows.push(row("INCOME", 0.3, "2026-03-02"), row("INCOME", 0.2, "2026-03-02"));
    expect(totalsOf(rows)).toEqual({ incomeCents: 50, expenseCents: 100, balanceCents: -50 });
  });

  it("accepts numeric strings and totals per month", () => {
    const rows = [row("INCOME", 1500.5, "2026-02-28"), row("EXPENSE", 20.25, "2026-03-01"), row("EXPENSE", 0.75, "2026-03-31")];
    expect(totalsForMonth(rows, 2026, 3)).toEqual({ incomeCents: 0, expenseCents: 2100, balanceCents: -2100 });
    expect(totalsForMonth(rows, 2026, 2).incomeCents).toBe(150050);
  });

  it("aggregates by month and ignores rows outside the keys", () => {
    const keys = lastMonthKeys(2026, 3, 3);
    const out = aggregateByMonth(
      [row("INCOME", 10, "2026-01-15"), row("EXPENSE", 4, "2026-03-02"), row("INCOME", 99, "2025-12-31")],
      keys,
    );
    expect(out.map((m) => [m.key, m.incomeCents, m.expenseCents])).toEqual([
      ["2026-01", 1000, 0],
      ["2026-02", 0, 0],
      ["2026-03", 0, 400],
    ]);
  });

  it("groups expenses by category, largest first, ignoring income", () => {
    const out = sumExpensesByCategory([
      row("EXPENSE", 5, "2026-03-01", "a"),
      row("EXPENSE", 20, "2026-03-01", "b"),
      row("EXPENSE", 5, "2026-03-02", "a"),
      row("INCOME", 999, "2026-03-02", "z"),
    ]);
    expect(out).toEqual([
      { categoryId: "b", cents: 2000 },
      { categoryId: "a", cents: 1000 },
    ]);
  });
});

describe("month series", () => {
  it("crosses the year boundary", () => {
    expect(lastMonthKeys(2026, 2, 6)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("covers a range inclusively", () => {
    expect(monthKeysBetween("2025-11-20", "2026-01-02")).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(monthKeysBetween("2026-03-01", "2026-03-31")).toEqual(["2026-03"]);
  });
  it("labels months in Spanish", () => {
    expect(monthKeyLabel("2026-01")).toBe("ene 2026");
    expect(monthKeyLabel("2025-12")).toBe("dic 2025");
  });
});

describe("percent allocation", () => {
  it("sums to exactly 100.0%", () => {
    const tenths = allocatePercentTenths([1, 1, 1]);
    expect(tenths.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(tenths).toEqual([334, 333, 333]);
  });
  it("sums to 100.0% for uneven values", () => {
    const tenths = allocatePercentTenths([12345, 6789, 101, 5, 77777]);
    expect(tenths.reduce((a, b) => a + b, 0)).toBe(1000);
  });
  it("returns zeros for no spending and formats", () => {
    expect(allocatePercentTenths([0, 0])).toEqual([0, 0]);
    expect(allocatePercentTenths([])).toEqual([]);
    expect(formatPercentTenths(853)).toBe("85,3 %");
  });
});

describe("budget status thresholds", () => {
  const budget = 10000; // 100.00
  it("79.99% is ok", () => {
    const r = computeBudgetConsumption(7999, budget);
    expect(r.status).toBe("ok");
    expect(r.percent).toBe(79.99);
  });
  it("80% is warning", () => {
    expect(computeBudgetConsumption(8000, budget).status).toBe("warning");
  });
  it("100% is warning (not yet exceeded)", () => {
    const r = computeBudgetConsumption(10000, budget);
    expect(r.status).toBe("warning");
    expect(r.remainingCents).toBe(0);
  });
  it("100.01% is exceeded", () => {
    const r = computeBudgetConsumption(10001, budget);
    expect(r.status).toBe("exceeded");
    expect(r.percent).toBe(100.01);
    expect(r.remainingCents).toBe(-1);
  });
  it("handles zero spend and zero budget", () => {
    expect(computeBudgetConsumption(0, budget)).toMatchObject({ status: "ok", percent: 0 });
    expect(computeBudgetConsumption(0, 0).status).toBe("ok");
    expect(computeBudgetConsumption(1, 0).status).toBe("exceeded");
  });
  it("does not overflow with the maximum budget", () => {
    const max = 99_999_999_999_999;
    expect(computeBudgetConsumption(max, max).status).toBe("warning");
    expect(computeBudgetConsumption(max - 1, max).percent).toBe(99.99);
  });
});

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("budget schemas", () => {
  const valid = { categoryId: UUID, amount: "250.50", month: 3, year: 2026 };
  it("accepts a valid budget", () => {
    expect(budgetCreateSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["zero amount", { amount: "0" }],
    ["3 decimals", { amount: "1.234" }],
    ["negative", { amount: "-5" }],
    ["month 0", { month: 0 }],
    ["month 13", { month: 13 }],
    ["year 1999", { year: 1999 }],
    ["year 2101", { year: 2101 }],
    ["bad uuid", { categoryId: "nope" }],
    ["fractional month", { month: 1.5 }],
  ])("rejects %s", (_name, patch) => {
    expect(budgetCreateSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("strips unknown fields (no mass assignment)", () => {
    const parsed = budgetCreateSchema.parse({ ...valid, user_id: "evil", id: "x" });
    expect(parsed).not.toHaveProperty("user_id");
    expect(parsed).not.toHaveProperty("id");
  });
  it("update schema only takes the amount", () => {
    expect(budgetUpdateSchema.parse({ amount: "10", month: 5 })).toEqual({ amount: "10" });
    expect(budgetUpdateSchema.safeParse({ amount: "0" }).success).toBe(false);
  });
  it("period params fall back to today", () => {
    const today = { year: 2026, month: 11 };
    expect(parseBudgetPeriod({}, today)).toEqual({ year: 2026, month: 11 });
    expect(parseBudgetPeriod({ month: "13", year: "2026" }, today)).toEqual(today);
    expect(parseBudgetPeriod({ month: "abc", year: "2026" }, today)).toEqual(today);
    expect(parseBudgetPeriod({ month: "2", year: "2025" }, today)).toEqual({ year: 2025, month: 2 });
  });
});

describe("report range parsing", () => {
  const today = "2026-11-23";
  it("defaults to the current month", () => {
    expect(parseReportRange({}, today)).toEqual({ from: "2026-11-01", to: "2026-11-30", clamped: false });
    expect(parseReportRange({ from: "garbage", to: "2026-13-40" }, today).from).toBe("2026-11-01");
  });
  it("swaps inverted ranges", () => {
    expect(parseReportRange({ from: "2026-05-10", to: "2026-03-01" }, today)).toEqual({
      from: "2026-03-01",
      to: "2026-05-10",
      clamped: false,
    });
  });
  it("clamps ranges longer than 24 months", () => {
    const r = parseReportRange({ from: "2020-01-01", to: "2026-03-15" }, today);
    expect(r.clamped).toBe(true);
    expect(r.to).toBe("2026-03-15");
    expect(r.from).toBe("2024-04-01");
    expect(monthKeysBetween(r.from, r.to)).toHaveLength(24);
  });
  it("allows exactly 24 months", () => {
    expect(parseReportRange({ from: "2024-04-01", to: "2026-03-31" }, today).clamped).toBe(false);
  });
});
