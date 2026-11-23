import { describe, expect, it } from "vitest";
import { allocatePercentTenths } from "@/lib/utils/aggregation";
import { createBudget, deleteBudget, listBudgetProgress, updateBudgetAmount } from "@/services/budgets";
import { getDashboardSummary, getRecentTransactions } from "@/services/dashboard";
import { getReport } from "@/services/reports";
import { GENERIC_ERROR, NOT_FOUND } from "@/services/result";
import { fetchTransactionRows, MAX_ROWS } from "@/services/transaction-rows";

type Call = { table: string; ops: Array<[string, unknown[]]> };
type Responder = (call: Call) => { data?: unknown; error?: unknown };

function fake(responder: Responder) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const proxy: unknown = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === "then") {
              return (res: (v: unknown) => void) => res({ data: null, error: null, ...responder(call) });
            }
            return (...args: unknown[]) => {
              call.ops.push([prop, args]);
              return proxy;
            };
          },
        },
      );
      return proxy;
    },
  };
  return { client: client as never, calls };
}

const U = "11111111-1111-4111-8111-111111111111";
const CAT = "22222222-2222-4222-8222-222222222222";
const B = "44444444-4444-4444-8444-444444444444";
const hasEqUser = (c: Call) => c.ops.some(([n, a]) => n === "eq" && a[0] === "user_id" && a[1] === U);
const rangeOf = (c: Call) => c.ops.find(([n]) => n === "range")![1] as [number, number];

/** Responder serving `total` synthetic rows honoring .range(). */
function pagedRows(total: number, make: (i: number) => unknown): Responder {
  return (c) => {
    if (c.table !== "transactions") return { data: [] };
    const [from, to] = rangeOf(c);
    const out = [];
    for (let i = from; i <= to && i < total; i++) out.push(make(i));
    return { data: out };
  };
}
const mk = (i: number) => ({ type: i % 2 ? "INCOME" : "EXPENSE", amount: 0.1, transaction_date: "2026-03-01", category_id: CAT });

describe("fetchTransactionRows paging", () => {
  it("pages by 1000 with stable (date,id) order and user scope; 2500 rows -> 3 requests", async () => {
    const { client, calls } = fake(pagedRows(2500, mk));
    const r = await fetchTransactionRows(client, U);
    expect(r.ok && r.data.length).toBe(2500);
    expect(calls).toHaveLength(3);
    expect(calls.map(rangeOf)).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    for (const c of calls) {
      expect(hasEqUser(c)).toBe(true);
      const orders = c.ops.filter(([n]) => n === "order").map(([, a]) => a[0]);
      expect(orders).toEqual(["transaction_date", "id"]);
    }
  });

  it("exactly 1000 rows needs a second (empty) request, 0 rows needs one", async () => {
    const a = fake(pagedRows(1000, mk));
    expect((await fetchTransactionRows(a.client, U)).ok).toBe(true);
    expect(a.calls).toHaveLength(2);
    const b = fake(pagedRows(0, mk));
    const r = await fetchTransactionRows(b.client, U);
    expect(r).toEqual({ ok: true, data: [] });
    expect(b.calls).toHaveLength(1);
  });

  it("applies date range and type filters", async () => {
    const { client, calls } = fake(() => ({ data: [] }));
    await fetchTransactionRows(client, U, { from: "2026-03-01", to: "2026-03-31", type: "EXPENSE" });
    expect(calls[0].ops).toContainEqual(["gte", ["transaction_date", "2026-03-01"]]);
    expect(calls[0].ops).toContainEqual(["lte", ["transaction_date", "2026-03-31"]]);
    expect(calls[0].ops).toContainEqual(["eq", ["type", "EXPENSE"]]);
  });

  it("DB error yields the generic error, no detail", async () => {
    const { client } = fake(() => ({ error: { message: "relation secret_table does not exist", code: "42P01" } }));
    expect(await fetchTransactionRows(client, U)).toEqual({ ok: false, error: GENERIC_ERROR });
  });

  it("fails loudly (never truncates) above MAX_ROWS", async () => {
    const { client } = fake(pagedRows(MAX_ROWS + 1, mk));
    const r = await fetchTransactionRows(client, U);
    expect(r.ok).toBe(false);
  });

  it("accepts exactly MAX_ROWS rows", async () => {
    const { client } = fake(pagedRows(MAX_ROWS, mk));
    const r = await fetchTransactionRows(client, U);
    expect(r.ok).toBe(true);
  });
});

describe("getDashboardSummary", () => {
  it("empty data gives zeros and 6 empty months", async () => {
    const { client } = fake(() => ({ data: [] }));
    const r = await getDashboardSummary(client, U, "2026-02-10");
    expect(r.ok && r.data.allTime).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0 });
    expect(r.ok && r.data.series.map((s) => s.key)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("all-time vs current month vs series (year boundary, old rows excluded from series only)", async () => {
    const rows = [
      { type: "INCOME", amount: 1000, transaction_date: "2024-05-01", category_id: CAT },
      { type: "EXPENSE", amount: 10.1, transaction_date: "2025-12-31", category_id: CAT },
      { type: "INCOME", amount: 50.2, transaction_date: "2026-01-01", category_id: CAT },
      { type: "EXPENSE", amount: 0.2, transaction_date: "2026-01-31", category_id: CAT },
    ];
    const { client, calls } = fake(pagedRows(rows.length, (i) => rows[i]));
    const r = await getDashboardSummary(client, U, "2026-01-15");
    if (!r.ok) throw new Error("fail");
    expect(r.data.allTime).toEqual({ incomeCents: 105020, expenseCents: 1030, balanceCents: 103990 });
    expect(r.data.currentMonth).toEqual({ incomeCents: 5020, expenseCents: 20, balanceCents: 5000 });
    const dec = r.data.series.find((s) => s.key === "2025-12")!;
    expect(dec.expenseCents).toBe(1010);
    expect(r.data.series.reduce((a, s) => a + s.incomeCents, 0)).toBe(5020); // 2024 income excluded
    expect(calls.every(hasEqUser)).toBe(true);
  });

  it("recent transactions are scoped, limited to 10 and fall back for unknown category", async () => {
    const { client, calls } = fake((c) =>
      c.table === "transactions"
        ? { data: [{ id: "t", type: "EXPENSE", amount: 5, description: "", transaction_date: "2026-01-01", category_id: "gone" }] }
        : { data: [] },
    );
    const r = await getRecentTransactions(client, U, 9999);
    expect(calls.every(hasEqUser)).toBe(true);
    expect(calls[0].ops).toContainEqual(["limit", [10]]);
    expect(r.ok && r.data[0].categoryName).toBe("Sin categoría");
  });
});

describe("getReport", () => {
  const rows = [
    { type: "EXPENSE", amount: 1, transaction_date: "2026-03-01", category_id: "a" },
    { type: "EXPENSE", amount: 1, transaction_date: "2026-03-02", category_id: "b" },
    { type: "EXPENSE", amount: 1, transaction_date: "2026-03-03", category_id: "ghost" },
    { type: "INCOME", amount: 500, transaction_date: "2026-03-03", category_id: "i" },
  ];
  it("scopes all queries, percentages sum to exactly 100.0, unknown category is labelled safely", async () => {
    const { client, calls } = fake((c) =>
      c.table === "transactions"
        ? pagedRows(rows.length, (i) => rows[i])(c)
        : { data: [{ id: "a", name: "A", color: "#111111" }, { id: "b", name: "B", color: "#222222" }] },
    );
    const r = await getReport(client, U, "2026-03-01", "2026-03-31");
    if (!r.ok) throw new Error("fail");
    expect(calls.every(hasEqUser)).toBe(true);
    expect(r.data.expensesByCategory.reduce((a, s) => a + s.percentTenths, 0)).toBe(1000);
    expect(r.data.expensesByCategory.map((s) => s.name).sort()).toEqual(["A", "B", "Sin categoría"]);
    expect(r.data.totals.balanceCents).toBe(49700);
    expect(r.data.transactionCount).toBe(4);
  });
  it("categories query failure -> generic error", async () => {
    const { client } = fake((c) => (c.table === "categories" ? { error: { message: "boom" } } : { data: [] }));
    expect(await getReport(client, U, "2026-03-01", "2026-03-31")).toEqual({ ok: false, error: GENERIC_ERROR });
  });
});

describe("allocatePercentTenths fuzz", () => {
  // deterministic LCG
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  it("always sums to 1000 for realistic magnitudes", () => {
    for (let n = 0; n < 3000; n++) {
      const len = 1 + Math.floor(rnd() * 40);
      const mag = 10 ** Math.floor(rnd() * 11);
      const vals = Array.from({ length: len }, () => 1 + Math.floor(rnd() * mag));
      const out = allocatePercentTenths(vals);
      expect(out.reduce((a, b) => a + b, 0)).toBe(1000);
      expect(out.every((v) => v >= 0)).toBe(true);
    }
  });
  it("sums to 1000 for huge cents (near NUMERIC(14,2) max)", () => {
    for (let n = 0; n < 500; n++) {
      const vals = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => 1 + Math.floor(rnd() * 99_999_999_999_999));
      expect(allocatePercentTenths(vals).reduce((a, b) => a + b, 0)).toBe(1000);
    }
  });
});

describe("budgets service", () => {
  const input = { categoryId: CAT, amount: "100.50", month: 3, year: 2026 };

  it.each(["0", "-1", "1.234", "abc", "", "1e3"])("rejects bad amount %j before any query", async (amount) => {
    const { client, calls } = fake(() => ({ data: { id: CAT, type: "EXPENSE" } }));
    expect((await createBudget(client, U, { ...input, amount })).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("rejects missing/foreign category and INCOME category without inserting", async () => {
    const none = fake(() => ({ data: null }));
    expect((await createBudget(none.client, U, input)).ok).toBe(false);
    expect(none.calls.some((c) => c.ops.some(([n]) => n === "insert"))).toBe(false);
    expect(hasEqUser(none.calls[0])).toBe(true);
    const inc = fake(() => ({ data: { id: CAT, type: "INCOME" } }));
    expect((await createBudget(inc.client, U, input)).ok).toBe(false);
    expect(inc.calls.some((c) => c.ops.some(([n]) => n === "insert"))).toBe(false);
  });

  it("insert forces session user_id, exact amount, and ignores smuggled fields", async () => {
    const { client, calls } = fake((c) => (c.table === "categories" ? { data: { id: CAT, type: "EXPENSE" } } : { data: { id: B } }));
    const r = await createBudget(client, U, { ...input, user_id: "evil", id: "x" } as never);
    expect(r.ok).toBe(true);
    const payload = calls.find((c) => c.table === "budgets")!.ops.find(([n]) => n === "insert")![1][0] as Record<string, unknown>;
    expect(payload).toEqual({ user_id: U, category_id: CAT, amount: 100.5, month: 3, year: 2026 });
  });

  it("duplicate (23505) gives the friendly message; other DB errors are generic and leak nothing", async () => {
    const mkc = (code: string) =>
      fake((c) => (c.table === "categories" ? { data: { id: CAT, type: "EXPENSE" } } : { error: { code, message: "constraint budgets_user_category_period_key" } }));
    const dup = await createBudget(mkc("23505").client, U, input);
    expect(dup).toMatchObject({ ok: false, error: "Ya existe un presupuesto para esa categoría en ese mes." });
    const other = await createBudget(mkc("23514").client, U, input);
    expect(other).toEqual({ ok: false, error: GENERIC_ERROR });
  });

  it("update/delete are scoped by id AND user_id; foreign id -> NOT_FOUND; payload only amount", async () => {
    const upd = fake(() => ({ data: { id: B } }));
    await updateBudgetAmount(upd.client, U, B, { amount: "5", user_id: "evil", month: 1 } as never);
    expect(hasEqUser(upd.calls[0])).toBe(true);
    expect(upd.calls[0].ops).toContainEqual(["eq", ["id", B]]);
    expect(upd.calls[0].ops.find(([n]) => n === "update")![1][0]).toEqual({ amount: 5 });

    const foreignU = fake(() => ({ data: null }));
    expect(await updateBudgetAmount(foreignU.client, U, B, { amount: "5" })).toEqual({ ok: false, error: NOT_FOUND });
    const foreignD = fake(() => ({ data: null }));
    expect(await deleteBudget(foreignD.client, U, B)).toEqual({ ok: false, error: NOT_FOUND });
    expect(hasEqUser(foreignD.calls[0])).toBe(true);
    expect(foreignD.calls[0].ops).toContainEqual(["eq", ["id", B]]);
    expect((await updateBudgetAmount(foreignU.client, U, B, { amount: "0" })).ok).toBe(false);
  });

  it("listBudgetProgress: every query scoped, spent per category, statuses, zero spent, sort critical first", async () => {
    const budgets = [
      { id: "b1", category_id: "c1", amount: 100, month: 3, year: 2026 },
      { id: "b2", category_id: "c2", amount: 100, month: 3, year: 2026 },
      { id: "b3", category_id: "c3", amount: 100, month: 3, year: 2026 },
      { id: "b4", category_id: "gone", amount: 100, month: 3, year: 2026 },
    ];
    const tx = [
      { type: "EXPENSE", amount: 79.99, transaction_date: "2026-03-02", category_id: "c1" },
      { type: "EXPENSE", amount: 100.01, transaction_date: "2026-03-02", category_id: "c2" },
    ];
    const { client, calls } = fake((c) => {
      if (c.table === "budgets") return { data: budgets };
      if (c.table === "categories")
        return { data: ["c1", "c2", "c3"].map((id) => ({ id, name: id.toUpperCase(), color: "#000000", type: "EXPENSE" })) };
      return pagedRows(tx.length, (i) => tx[i])(c);
    });
    const r = await listBudgetProgress(client, U, 2026, 3);
    if (!r.ok) throw new Error("fail");
    expect(calls.every(hasEqUser)).toBe(true);
    expect(calls.find((c) => c.table === "budgets")!.ops).toContainEqual(["eq", ["month", 3]]);
    expect(r.data.map((i) => [i.categoryId, i.status, i.spentCents])).toEqual([
      ["c2", "exceeded", 10001],
      ["c1", "ok", 7999],
      ["c3", "ok", 0],
    ]); // orphan budget (no expense category) is skipped, not crashed on
    const txCall = calls.find((c) => c.table === "transactions")!;
    expect(txCall.ops).toContainEqual(["eq", ["type", "EXPENSE"]]);
    expect(txCall.ops).toContainEqual(["gte", ["transaction_date", "2026-03-01"]]);
    expect(txCall.ops).toContainEqual(["lte", ["transaction_date", "2026-03-31"]]);
  });

  it("listBudgetProgress: any sub-query error -> generic", async () => {
    const { client } = fake((c) => (c.table === "budgets" ? { error: { message: "x" } } : { data: [] }));
    expect(await listBudgetProgress(client, U, 2026, 3)).toEqual({ ok: false, error: GENERIC_ERROR });
  });
});
