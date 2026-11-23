import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const revalidatePath = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
const svc = vi.hoisted(() => ({ createBudget: vi.fn(), updateBudgetAmount: vi.fn(), deleteBudget: vi.fn() }));
vi.mock("@/services/budgets", () => svc);

import { createBudgetAction, deleteBudgetAction, updateBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { resetRateLimits } from "@/lib/utils/rate-limit";

const ID = "44444444-4444-4444-8444-444444444444";
const CAT = "22222222-2222-4222-8222-222222222222";
const valid = { categoryId: CAT, amount: "10.00", month: 3, year: 2026 };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  getUser.mockResolvedValue({ data: { user: { id: "user-A" } } });
  for (const f of Object.values(svc)) f.mockResolvedValue({ ok: true, data: {} });
});

const all: Array<[string, () => Promise<{ ok: boolean }>]> = [
  ["create", () => createBudgetAction(valid)],
  ["update", () => updateBudgetAction(ID, { amount: "5" })],
  ["delete", () => deleteBudgetAction(ID)],
];

describe("T2bR budget actions", () => {
  it.each(all)("%s rejects anonymous callers", async (_n, run) => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await run()).ok).toBe(false);
    for (const f of Object.values(svc)) expect(f).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(all)("%s passes session user id and revalidates /budgets and /dashboard", async (_n, run) => {
    expect((await run()).ok).toBe(true);
    const called = Object.values(svc).find((f) => f.mock.calls.length)!;
    expect(called.mock.calls[0][1]).toBe("user-A");
    expect(revalidatePath).toHaveBeenCalledWith("/budgets");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("mass assignment never reaches the service", async () => {
    await createBudgetAction({ ...valid, user_id: "victim", id: ID });
    expect(svc.createBudget.mock.calls[0][2]).toEqual(valid);
    await updateBudgetAction(ID, { amount: "5", user_id: "victim", month: 1, categoryId: CAT });
    expect(svc.updateBudgetAmount.mock.calls[0][3]).toEqual({ amount: "5" });
  });

  it.each([
    ["month 13", { month: 13 }],
    ["month 0", { month: 0 }],
    ["year 1999", { year: 1999 }],
    ["year 2101", { year: 2101 }],
    ["zero", { amount: "0" }],
    ["negative", { amount: "-1" }],
    ["3 decimals", { amount: "1.234" }],
    ["string month", { month: "3" }],
    ["bad category", { categoryId: "x" }],
    ["huge", { amount: "9999999999999" }],
  ])("create rejects %s", async (_n, patch) => {
    expect((await createBudgetAction({ ...valid, ...patch })).ok).toBe(false);
    expect(svc.createBudget).not.toHaveBeenCalled();
  });

  it.each([null, undefined, 1, {}, "nope", ["x"]])("update/delete reject invalid id %j", async (id) => {
    expect((await updateBudgetAction(id, { amount: "5" })).ok).toBe(false);
    expect((await deleteBudgetAction(id)).ok).toBe(false);
    expect(svc.updateBudgetAmount).not.toHaveBeenCalled();
    expect(svc.deleteBudget).not.toHaveBeenCalled();
  });

  it("service failure is surfaced without revalidating", async () => {
    svc.deleteBudget.mockResolvedValue({ ok: false, error: "No encontrado" });
    expect(await deleteBudgetAction(ID)).toEqual({ ok: false, error: "No encontrado" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
