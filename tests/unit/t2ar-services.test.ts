import { describe, expect, it } from "vitest";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/services/categories";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "@/services/transactions";
import { GENERIC_ERROR, NOT_FOUND } from "@/services/result";

type Call = { table: string; ops: Array<[string, unknown[]]> };
type Responder = (call: Call) => { data?: unknown; error?: unknown; count?: number | null };

/** Fake supabase client recording every chained call; thenable like PostgREST builders. */
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
              return (res: (v: unknown) => void) => res({ data: null, error: null, count: null, ...responder(call) });
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
const TX = "33333333-3333-4333-8333-333333333333";
const hasEqUser = (c: Call) => c.ops.some(([n, a]) => n === "eq" && a[0] === "user_id" && a[1] === U);
const input = { type: "EXPENSE" as const, categoryId: CAT, amount: "10.50", description: "x", transactionDate: "2026-03-05" };

describe("T2aR services: every query is scoped by user_id", () => {
  it("listTransactions applies user scope, filters, order and range; never uses or()/ilike()", async () => {
    const { client, calls } = fake(() => ({ data: [], count: 0 }));
    const r = await listTransactions(client, U, {
      page: 3, pageSize: 20, from: "2026-01-01", to: "2026-01-31", categoryId: CAT, type: "INCOME",
    });
    expect(r.ok).toBe(true);
    const ops = calls[0].ops.map(([n]) => n);
    expect(hasEqUser(calls[0])).toBe(true);
    expect(ops).not.toContain("or");
    expect(ops).not.toContain("ilike");
    expect(calls[0].ops).toContainEqual(["range", [40, 59]]);
    expect(calls[0].ops).toContainEqual(["gte", ["transaction_date", "2026-01-01"]]);
    expect(calls[0].ops).toContainEqual(["lte", ["transaction_date", "2026-01-31"]]);
  });

  it("createTransaction forces user_id from session, stores amount as exact 2-decimal number", async () => {
    const { client, calls } = fake((c) =>
      c.table === "categories" ? { data: { id: CAT, type: "EXPENSE" } } : { data: { id: TX } },
    );
    const r = await createTransaction(client, U, { ...input, user_id: "evil" } as never);
    expect(r.ok).toBe(true);
    const insert = calls.find((c) => c.table === "transactions")!.ops.find(([n]) => n === "insert")![1][0] as Record<string, unknown>;
    expect(insert.user_id).toBe(U);
    expect(insert.amount).toBe(10.5);
    expect(insert).not.toHaveProperty("id");
    // category lookup scoped by user (foreign category cannot be referenced)
    expect(hasEqUser(calls.find((c) => c.table === "categories")!)).toBe(true);
  });

  it("createTransaction rejects foreign/missing category and type mismatch before inserting", async () => {
    const missing = fake(() => ({ data: null }));
    expect((await createTransaction(missing.client, U, input)).ok).toBe(false);
    expect(missing.calls.some((c) => c.ops.some(([n]) => n === "insert"))).toBe(false);

    const mismatch = fake(() => ({ data: { id: CAT, type: "INCOME" } }));
    const r = await createTransaction(mismatch.client, U, input);
    expect(r.ok).toBe(false);
    expect(mismatch.calls.some((c) => c.ops.some(([n]) => n === "insert"))).toBe(false);
  });

  it.each(["0", "-1", "1.234", "abc", ""])("createTransaction rejects bad amount %j at the service layer", async (amount) => {
    const { client, calls } = fake(() => ({ data: { id: CAT, type: "EXPENSE" } }));
    const r = await createTransaction(client, U, { ...input, amount });
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("updateTransaction on a foreign id returns NOT_FOUND and never issues an update", async () => {
    const { client, calls } = fake(() => ({ data: null }));
    const r = await updateTransaction(client, U, TX, input);
    expect(r).toEqual({ ok: false, error: NOT_FOUND });
    expect(calls.some((c) => c.ops.some(([n]) => n === "update"))).toBe(false);
  });

  it("updateTransaction update is scoped by id AND user_id and never sends user_id/id", async () => {
    const { client, calls } = fake((c) => {
      if (c.table === "categories") return { data: { id: CAT, type: "EXPENSE" } };
      return { data: { id: TX } };
    });
    const r = await updateTransaction(client, U, TX, input);
    expect(r.ok).toBe(true);
    const upd = calls.find((c) => c.ops.some(([n]) => n === "update"))!;
    expect(hasEqUser(upd)).toBe(true);
    expect(upd.ops).toContainEqual(["eq", ["id", TX]]);
    const payload = upd.ops.find(([n]) => n === "update")![1][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("user_id");
    expect(payload).not.toHaveProperty("id");
  });

  it("deleteTransaction is scoped by id and user_id; foreign id => NOT_FOUND", async () => {
    const { client, calls } = fake(() => ({ data: null }));
    expect(await deleteTransaction(client, U, TX)).toEqual({ ok: false, error: NOT_FOUND });
    expect(hasEqUser(calls[0])).toBe(true);
    expect(calls[0].ops).toContainEqual(["eq", ["id", TX]]);
  });

  it("raw DB errors are never disclosed", async () => {
    const secret = 'duplicate key value violates constraint "transactions_pkey" at db.internal:5432';
    const { client } = fake((c) =>
      c.table === "categories" ? { data: { id: CAT, type: "EXPENSE" } } : { error: { code: "XX000", message: secret } },
    );
    for (const r of [
      await createTransaction(client, U, input),
      await deleteTransaction(client, U, TX),
      await listTransactions(client, U, { page: 1, pageSize: 10 }),
    ]) {
      expect(r).toEqual({ ok: false, error: GENERIC_ERROR });
      expect(JSON.stringify(r)).not.toContain("db.internal");
    }
  });

  it("categories: list/update/delete/create scoped by user_id; no user_id in update payload", async () => {
    const a = fake(() => ({ data: [] }));
    await listCategories(a.client, U);
    expect(hasEqUser(a.calls[0])).toBe(true);

    const b = fake(() => ({ data: { id: CAT } }));
    await updateCategory(b.client, U, CAT, { name: "N", color: "#10b981", type: "INCOME", user_id: "evil" } as never);
    expect(hasEqUser(b.calls[0])).toBe(true);
    const payload = b.calls[0].ops.find(([n]) => n === "update")![1][0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["color", "name"]);

    const c = fake(() => ({ data: { id: CAT } }));
    await createCategory(c.client, U, { name: "N", type: "INCOME", color: "#10b981", user_id: "evil" } as never);
    const ins = c.calls[0].ops.find(([n]) => n === "insert")![1][0] as Record<string, unknown>;
    expect(ins.user_id).toBe(U);
  });

  it("createCategory maps unique violation to a friendly message and hides other errors", async () => {
    const dup = fake(() => ({ error: { code: "23505", message: "raw" } }));
    const r1 = await createCategory(dup.client, U, { name: "N", type: "INCOME", color: "#10b981" });
    expect(r1.ok === false && r1.error).toMatch(/Ya existe/);
    const other = fake(() => ({ error: { code: "42501", message: "raw rls detail" } }));
    expect(await createCategory(other.client, U, { name: "N", type: "INCOME", color: "#10b981" })).toEqual({
      ok: false,
      error: GENERIC_ERROR,
    });
  });

  it("deleteCategory: foreign => NOT_FOUND; in use => blocked, no delete issued", async () => {
    const foreign = fake(() => ({ data: null }));
    expect(await deleteCategory(foreign.client, U, CAT)).toEqual({ ok: false, error: NOT_FOUND });

    const inUse = fake((c) => (c.ops.some(([n]) => n === "select" && false) ? {} : c.table === "categories" ? { data: { id: CAT } } : { count: 2 }));
    const r = await deleteCategory(inUse.client, U, CAT);
    expect(r.ok).toBe(false);
    expect(inUse.calls.some((c) => c.ops.some(([n]) => n === "delete"))).toBe(false);
    // the usage count is scoped to the user
    expect(hasEqUser(inUse.calls.find((c) => c.table === "transactions")!)).toBe(true);
  });
});
