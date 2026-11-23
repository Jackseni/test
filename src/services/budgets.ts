import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sumExpensesByCategory } from "@/lib/utils/aggregation";
import { computeBudgetConsumption, type BudgetStatus } from "@/lib/utils/budget-status";
import { monthRange } from "@/lib/utils/dates";
import { centsToNumeric, numericToCents, parseAmountToCents } from "@/lib/utils/money";
import type { BudgetCreateInput, BudgetUpdateInput } from "@/lib/validations/budget";
import type { Database } from "@/types/database";
import { getCategory, listCategories } from "./categories";
import { logServiceError } from "@/lib/log";
import { fail, GENERIC_ERROR, NOT_FOUND, success, type ServiceResult } from "./result";
import { fetchTransactionRows } from "./transaction-rows";

type Client = SupabaseClient<Database>;
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];

export const BUDGET_DUPLICATE = "Ya existe un presupuesto para esa categoría en ese mes.";
export const BUDGET_EXPENSE_ONLY = "Solo puedes crear presupuestos para categorías de gasto.";
const BUDGET_CATEGORY_INVALID = "La categoría seleccionada no existe o no es una categoría de gasto.";

export type BudgetProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  percent: number;
  status: BudgetStatus;
};

/** Budgets of a month with spending of that month per category (all scoped by user_id). */
export async function listBudgetProgress(
  supabase: Client,
  userId: string,
  year: number,
  month: number,
): Promise<ServiceResult<BudgetProgress[]>> {
  const range = monthRange(year, month);
  const [budgets, categories, rows] = await Promise.all([
    supabase.from("budgets").select("*").eq("user_id", userId).eq("year", year).eq("month", month),
    listCategories(supabase, userId, "EXPENSE"),
    fetchTransactionRows(supabase, userId, { ...range, type: "EXPENSE" }),
  ]);
  if (budgets.error) logServiceError("budgets.progress", budgets.error); // categories/rows log at source
  if (budgets.error || !categories.ok || !rows.ok) return fail(GENERIC_ERROR);

  const categoryById = new Map(categories.data.map((c) => [c.id, c]));
  const spentByCategory = new Map(sumExpensesByCategory(rows.data).map((s) => [s.categoryId, s.cents]));

  const items: BudgetProgress[] = [];
  for (const b of budgets.data) {
    const category = categoryById.get(b.category_id);
    if (!category) continue; // not an expense category of this user: cannot happen (trigger + FK)
    const budgetCents = numericToCents(b.amount);
    const spentCents = spentByCategory.get(b.category_id) ?? 0;
    const consumption = computeBudgetConsumption(spentCents, budgetCents);
    items.push({
      id: b.id,
      categoryId: b.category_id,
      categoryName: category.name,
      categoryColor: category.color,
      budgetCents,
      spentCents,
      ...consumption,
    });
  }
  // Most critical first, then by name for a stable order.
  items.sort((a, b) => b.percent - a.percent || a.categoryName.localeCompare(b.categoryName, "es"));
  return success(items);
}

export async function createBudget(
  supabase: Client,
  userId: string,
  input: BudgetCreateInput,
): Promise<ServiceResult<Budget>> {
  const cents = parseAmountToCents(input.amount);
  if (cents === null || cents <= 0) return fail("Monto inválido.");

  const category = await getCategory(supabase, userId, input.categoryId);
  if (!category.ok) return category;
  if (!category.data) return fail(BUDGET_CATEGORY_INVALID);
  if (category.data.type !== "EXPENSE") return fail(BUDGET_EXPENSE_ONLY);

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: userId,
      category_id: input.categoryId,
      amount: centsToNumeric(cents),
      month: input.month,
      year: input.year,
    })
    .select()
    .single();
  if (error) {
    if (error.code !== "23505") logServiceError("budgets.create", error);
    return fail(error.code === "23505" ? BUDGET_DUPLICATE : GENERIC_ERROR);
  }
  return success(data);
}

export async function updateBudgetAmount(
  supabase: Client,
  userId: string,
  id: string,
  input: BudgetUpdateInput,
): Promise<ServiceResult<Budget>> {
  const cents = parseAmountToCents(input.amount);
  if (cents === null || cents <= 0) return fail("Monto inválido.");
  const { data, error } = await supabase
    .from("budgets")
    .update({ amount: centsToNumeric(cents) })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) {
    logServiceError("budgets.update", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  return success(data);
}

export async function deleteBudget(supabase: Client, userId: string, id: string): Promise<ServiceResult<null>> {
  const { data, error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    logServiceError("budgets.delete", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  return success(null);
}
