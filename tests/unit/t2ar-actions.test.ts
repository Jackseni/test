import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const tx = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));
const cat = vi.hoisted(() => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock("@/services/transactions", () => tx);
vi.mock("@/services/categories", () => cat);

import { resetRateLimits } from "@/lib/utils/rate-limit";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/(dashboard)/categories/actions";
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/app/(dashboard)/transactions/actions";

const ID = "33333333-3333-4333-8333-333333333333";
const CAT = "22222222-2222-4222-8222-222222222222";
const validTx = { type: "EXPENSE", categoryId: CAT, amount: "10.50", description: "ok", transactionDate: "2026-03-05" };
const validCat = { name: "Comida", type: "EXPENSE", color: "#10b981" };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  getUser.mockResolvedValue({ data: { user: { id: "user-A" } } });
  for (const f of [...Object.values(tx), ...Object.values(cat)]) f.mockResolvedValue({ ok: true, data: {} });
});

const allActions: Array<[string, () => Promise<{ ok: boolean }>]> = [
  ["createTransaction", () => createTransactionAction(validTx)],
  ["updateTransaction", () => updateTransactionAction(ID, validTx)],
  ["deleteTransaction", () => deleteTransactionAction(ID)],
  ["createCategory", () => createCategoryAction(validCat)],
  ["updateCategory", () => updateCategoryAction(ID, { name: "x", color: "#10b981" })],
  ["deleteCategory", () => deleteCategoryAction(ID)],
];

describe("T2aR actions: authorization", () => {
  it.each(allActions)("%s rejects anonymous callers without touching services", async (_n, run) => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await run();
    expect(r.ok).toBe(false);
    for (const f of [...Object.values(tx), ...Object.values(cat)]) expect(f).not.toHaveBeenCalled();
  });

  it.each(allActions)("%s calls getUser and passes the session user id", async (_n, run) => {
    expect((await run()).ok).toBe(true);
    expect(getUser).toHaveBeenCalled();
    const called = [...Object.values(tx), ...Object.values(cat)].find((f) => f.mock.calls.length);
    expect(called!.mock.calls[0][1]).toBe("user-A");
  });

  it("mass assignment: user_id/id in payload never reach the service", async () => {
    await createTransactionAction({ ...validTx, user_id: "victim", id: ID });
    expect(tx.createTransaction.mock.calls[0][2]).not.toHaveProperty("user_id");
    expect(tx.createTransaction.mock.calls[0][2]).not.toHaveProperty("id");
    await updateCategoryAction(ID, { name: "x", color: "#10b981", type: "INCOME", user_id: "victim" });
    expect(cat.updateCategory.mock.calls[0][3]).toEqual({ name: "x", color: "#10b981" });
    await createCategoryAction({ ...validCat, user_id: "victim" });
    expect(cat.createCategory.mock.calls[0][2]).not.toHaveProperty("user_id");
  });

  it.each([null, undefined, 123, {}, "not-a-uuid", "1; drop table", ["x"]])("rejects invalid id %j", async (id) => {
    expect((await deleteTransactionAction(id)).ok).toBe(false);
    expect((await updateTransactionAction(id, validTx)).ok).toBe(false);
    expect((await deleteCategoryAction(id)).ok).toBe(false);
    expect((await updateCategoryAction(id, { name: "x", color: "#10b981" })).ok).toBe(false);
    expect(tx.deleteTransaction).not.toHaveBeenCalled();
    expect(cat.deleteCategory).not.toHaveBeenCalled();
  });

  it.each([
    ["empty amount", { amount: "" }],
    ["negative", { amount: "-5" }],
    ["zero", { amount: "0.00" }],
    ["3 decimals", { amount: "1.001" }],
    ["huge", { amount: "9999999999999" }],
    ["exponent", { amount: "1e3" }],
    ["thousands comma+dot", { amount: "1,234.56" }],
    ["european thousands", { amount: "1.234,56" }],
    ["multiple commas", { amount: "1,2,3" }],
    ["3 decimals comma", { amount: "10,505" }],
    ["zero comma", { amount: "0,00" }],
    ["leading comma", { amount: ",5" }],
    ["trailing comma", { amount: "5," }],
    ["negative comma", { amount: "-1,5" }],
    ["non-string amount", { amount: 5 }],
    ["Feb 30", { transactionDate: "2026-02-30" }],
    ["month 13", { transactionDate: "2026-13-01" }],
    ["datetime", { transactionDate: "2026-03-05T00:00:00Z" }],
    ["year 1999", { transactionDate: "1999-12-31" }],
    ["long description", { description: "a".repeat(256) }],
    ["bad type", { type: "TRANSFER" }],
    ["category not uuid", { categoryId: "abc" }],
    ["category sql", { categoryId: "' or 1=1 --" }],
    ["missing description", { description: undefined }],
  ])("transaction validation rejects: %s", async (_n, patch) => {
    const r = await createTransactionAction({ ...validTx, ...patch });
    expect(r.ok).toBe(false);
    expect(tx.createTransaction).not.toHaveBeenCalled();
  });

  it("accepts boundary values: 255-char description, 2000-01-01, leap day, max amount", async () => {
    for (const patch of [
      { description: "a".repeat(255) },
      { transactionDate: "2000-01-01" },
      { transactionDate: "2024-02-29" },
      { amount: "999999999999.99" },
      { amount: "0.01" },
      { description: "" },
    ]) {
      expect((await createTransactionAction({ ...validTx, ...patch })).ok).toBe(true);
    }
    expect((await createTransactionAction({ ...validTx, transactionDate: "2026-02-29" })).ok).toBe(false);
  });

  it.each([
    ["css injection color", { color: "red; background:url(//evil)" }],
    ["named color", { color: "red" }],
    ["short hex", { color: "#fff" }],
    ["quote break-out", { color: '#10b981" onload="x' }],
    ["empty name", { name: "   " }],
    ["long name", { name: "a".repeat(51) }],
    ["bad type", { type: "X" }],
  ])("category validation rejects: %s", async (_n, patch) => {
    expect((await createCategoryAction({ ...validCat, ...patch })).ok).toBe(false);
    expect(cat.createCategory).not.toHaveBeenCalled();
  });

  it("a single decimal comma is accepted and reaches the service as the dot form", async () => {
    expect((await createTransactionAction({ ...validTx, amount: "10,50" })).ok).toBe(true);
    expect(tx.createTransaction.mock.calls[0][2].amount).toBe("10.50");
    expect((await updateTransactionAction(ID, { ...validTx, amount: "0,01" })).ok).toBe(true);
    expect(tx.updateTransaction.mock.calls[0][3].amount).toBe("0.01");
  });

  it("returns field errors and no raw service/DB error text beyond service message", async () => {
    const r = await createTransactionAction({ ...validTx, amount: "x" });
    expect(r.fieldErrors?.amount).toBeTruthy();
  });

  it("is rate limited per user after 60 mutations/min", async () => {
    let limited = 0;
    for (let i = 0; i < 70; i++) {
      const r = await deleteTransactionAction(ID);
      if (!r.ok) limited++;
    }
    expect(limited).toBe(10);
    expect(tx.deleteTransaction).toHaveBeenCalledTimes(60);
  });
});
