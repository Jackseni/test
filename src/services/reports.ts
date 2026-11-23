import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateByMonth,
  allocatePercentTenths,
  monthKeysBetween,
  sumExpensesByCategory,
  totalsOf,
  type MonthTotals,
  type Totals,
} from "@/lib/utils/aggregation";
import type { Database } from "@/types/database";
import { listCategories } from "./categories";
import { fail, GENERIC_ERROR, success, type ServiceResult } from "./result";
import { fetchTransactionRows } from "./transaction-rows";

type Client = SupabaseClient<Database>;

export type CategoryShare = {
  categoryId: string;
  name: string;
  color: string;
  cents: number;
  /** Tenths of a percent; the list sums to exactly 1000 when there are expenses. */
  percentTenths: number;
};

export type Report = {
  from: string;
  to: string;
  totals: Totals;
  months: MonthTotals[];
  expensesByCategory: CategoryShare[];
  transactionCount: number;
};

export async function getReport(
  supabase: Client,
  userId: string,
  from: string,
  to: string,
): Promise<ServiceResult<Report>> {
  const [rows, categories] = await Promise.all([
    fetchTransactionRows(supabase, userId, { from, to }),
    listCategories(supabase, userId),
  ]);
  if (!rows.ok) return rows;
  if (!categories.ok) return fail(GENERIC_ERROR);

  const byId = new Map(categories.data.map((c) => [c.id, c]));
  const sums = sumExpensesByCategory(rows.data);
  const tenths = allocatePercentTenths(sums.map((s) => s.cents));

  return success({
    from,
    to,
    totals: totalsOf(rows.data),
    months: aggregateByMonth(rows.data, monthKeysBetween(from, to)),
    expensesByCategory: sums.map((s, i) => ({
      categoryId: s.categoryId,
      name: byId.get(s.categoryId)?.name ?? "Sin categoría",
      color: byId.get(s.categoryId)?.color ?? "#64748b",
      cents: s.cents,
      percentTenths: tenths[i],
    })),
    transactionCount: rows.data.length,
  });
}
