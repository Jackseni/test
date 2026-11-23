import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateByMonth,
  lastMonthKeys,
  totalsForMonth,
  totalsOf,
  type MonthTotals,
  type Totals,
} from "@/lib/utils/aggregation";
import type { Database } from "@/types/database";
import { listCategories } from "./categories";
import { logServiceError } from "@/lib/log";
import { fail, GENERIC_ERROR, success, type ServiceResult } from "./result";
import { fetchTransactionRows } from "./transaction-rows";

type Client = SupabaseClient<Database>;

export type DashboardSummary = {
  allTime: Totals;
  currentMonth: Totals;
  /** Last 6 months (oldest first), including the current one. */
  series: MonthTotals[];
};

/**
 * `today` is "YYYY-MM-DD" (server calendar). One paged scan of the user's
 * transactions feeds all three aggregates, so "all time" totals are exact.
 */
export async function getDashboardSummary(
  supabase: Client,
  userId: string,
  today: string,
): Promise<ServiceResult<DashboardSummary>> {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const rows = await fetchTransactionRows(supabase, userId);
  if (!rows.ok) return rows;
  return success({
    allTime: totalsOf(rows.data),
    currentMonth: totalsForMonth(rows.data, year, month),
    series: aggregateByMonth(rows.data, lastMonthKeys(year, month, 6)),
  });
}

export type RecentTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountNumeric: number;
  description: string;
  date: string;
  categoryName: string;
  categoryColor: string;
};

export async function getRecentTransactions(
  supabase: Client,
  userId: string,
  limit = 8,
): Promise<ServiceResult<RecentTransaction[]>> {
  const [tx, categories] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount, description, transaction_date, category_id")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 10)),
    listCategories(supabase, userId),
  ]);
  if (tx.error) logServiceError("dashboard.recent", tx.error); // categories log at source
  if (tx.error || !categories.ok) return fail(GENERIC_ERROR);
  const byId = new Map(categories.data.map((c) => [c.id, c]));
  return success(
    tx.data.map((t) => ({
      id: t.id,
      type: t.type,
      amountNumeric: t.amount,
      description: t.description,
      date: t.transaction_date,
      categoryName: byId.get(t.category_id)?.name ?? "Sin categoría",
      categoryColor: byId.get(t.category_id)?.color ?? "#64748b",
    })),
  );
}
