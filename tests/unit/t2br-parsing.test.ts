import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { monthKeysBetween } from "@/lib/utils/aggregation";
import { computeBudgetConsumption } from "@/lib/utils/budget-status";
import { parseBudgetPeriod } from "@/lib/validations/budget";
import { MAX_REPORT_MONTHS, parseReportRange } from "@/lib/validations/report";

const today = "2026-11-23";

describe("parseReportRange edge cases", () => {
  it("array params use the first value; garbage never throws", () => {
    expect(parseReportRange({ from: ["2026-01-01", "x"], to: ["2026-01-31"] }, today)).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
      clamped: false,
    });
    for (const bad of ["", "2026-02-30", "2026-1-1", "' OR 1=1 --", "<script>", "9999-01-01", "1999-12-31", "2026-01-01T00:00"]) {
      expect(() => parseReportRange({ from: bad, to: bad }, today)).not.toThrow();
      expect(parseReportRange({ from: bad, to: bad }, today).from).toBe("2026-11-01");
    }
  });
  it("only `from` or only `to` expands to that month", () => {
    expect(parseReportRange({ from: "2026-02-10" }, today)).toMatchObject({ from: "2026-02-10", to: "2026-02-28" });
    expect(parseReportRange({ to: "2024-02-10" }, today)).toMatchObject({ from: "2024-02-01", to: "2024-02-10" });
  });
  it("leap day and extreme range are clamped to <= 24 months", () => {
    expect(parseReportRange({ from: "2024-02-29", to: "2024-02-29" }, today).clamped).toBe(false);
    const r = parseReportRange({ from: "2000-01-01", to: "2100-12-31" }, today);
    expect(r).toEqual({ from: "2099-01-01", to: "2100-12-31", clamped: true });
    expect(monthKeysBetween(r.from, r.to)).toHaveLength(MAX_REPORT_MONTHS);
  });
  it("25 months clamps, swapped extreme range clamps too", () => {
    expect(parseReportRange({ from: "2024-03-01", to: "2026-03-31" }, today).clamped).toBe(true);
    expect(parseReportRange({ from: "2100-12-31", to: "2000-01-01" }, today).clamped).toBe(true);
  });
});

describe("parseBudgetPeriod edge cases", () => {
  const t = { year: 2026, month: 11 };
  it.each([
    [{ month: "", year: "2026" }],
    [{ month: "1.5", year: "2026" }],
    [{ month: "0", year: "2026" }],
    [{ month: "3", year: "1999" }],
    [{ month: "3", year: "2101" }],
    [{ month: "3" }],
    [{ month: "Infinity", year: "2026" }],
    [{ month: "<script>", year: "2026" }],
  ])("falls back for %j", (p) => {
    expect(parseBudgetPeriod(p, t)).toEqual(t);
  });
  it("accepts bounds and first of array", () => {
    expect(parseBudgetPeriod({ month: ["12", "1"], year: "2100" }, t)).toEqual({ month: 12, year: 2100 });
    expect(parseBudgetPeriod({ month: "1", year: "2000" }, t)).toEqual({ month: 1, year: 2000 });
  });
  // NOTE: z.coerce.number turns "" into 0 -> month invalid -> fallback (covered above).
});

describe("budget thresholds (extra)", () => {
  it("boundaries at non-round budgets use exact integer math", () => {
    // 80% of 3.33 = 2.664 -> 266 cents is ok, 267 is warning
    expect(computeBudgetConsumption(266, 333).status).toBe("ok");
    expect(computeBudgetConsumption(267, 333).status).toBe("warning");
    expect(computeBudgetConsumption(333, 333).status).toBe("warning");
    expect(computeBudgetConsumption(334, 333).status).toBe("exceeded");
  });
  it("percent floors, never rounds up", () => {
    expect(computeBudgetConsumption(9999, 10000).percent).toBe(99.99);
    expect(computeBudgetConsumption(1, 3).percent).toBe(33.33);
  });
  it("negative inputs do not throw", () => {
    expect(() => computeBudgetConsumption(-5, 100)).not.toThrow();
  });
});

describe("static security review of T2b sources", () => {
  const read = (p: string) => readFileSync(path.resolve(__dirname, "../../src", p), "utf8");
  it("no dangerouslySetInnerHTML anywhere in chart/budget/dashboard/report components", () => {
    for (const f of [
      "components/charts/category-distribution.tsx",
      "components/charts/income-expense-chart.tsx",
      "components/budgets/budget-progress.tsx",
      "components/budgets/budgets-manager.tsx",
      "components/dashboard/recent-transactions.tsx",
      "components/reports/report-filter.tsx",
    ]) {
      expect(read(f)).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
    }
  });
  it("services never use service-role/admin client and always filter user_id", () => {
    for (const f of ["services/budgets.ts", "services/dashboard.ts", "services/reports.ts", "services/transaction-rows.ts"]) {
      const src = read(f);
      expect(src).not.toMatch(/admin|service_role|SERVICE_ROLE/i);
      expect(src).toMatch(/\.eq\("user_id", userId\)|listCategories|getCategory|fetchTransactionRows/);
    }
  });
  it("pages authenticate with getUser() and redirect when anonymous", () => {
    for (const f of ["app/(dashboard)/dashboard/page.tsx", "app/(dashboard)/budgets/page.tsx", "app/(dashboard)/reports/page.tsx"]) {
      const src = read(f);
      expect(src).toMatch(/auth\.getUser\(\)/);
      expect(src).toMatch(/redirect\("\/login"\)/);
    }
  });
  it("transaction mutations revalidate every page that aggregates transactions", () => {
    const src = read("app/(dashboard)/transactions/actions.ts");
    for (const p of ["/transactions", "/dashboard", "/reports", "/budgets"]) expect(src).toContain(`revalidatePath("${p}")`);
  });
  it("category mutations also revalidate /dashboard, /budgets and /reports", () => {
    const src = read("app/(dashboard)/categories/actions.ts");
    for (const p of ["/dashboard", "/budgets", "/reports"]) expect(src).toContain(`revalidatePath("${p}")`);
  });
});
