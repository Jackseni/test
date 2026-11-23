import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AggRow } from "@/lib/utils/aggregation";
import type { Database, TransactionType } from "@/types/database";
import { logServiceError } from "@/lib/log";
import { fail, GENERIC_ERROR, success, type ServiceResult } from "./result";

type Client = SupabaseClient<Database>;

/**
 * Aggregation strategy: fetch only the 4 columns needed (scoped by user_id and
 * optional date range / type) and aggregate in app code with integer cents.
 * PostgREST caps a response at 1000 rows by default, so rows are read in pages
 * of 1000 with a stable ordering (date, id) until a short page is returned.
 * A hard cap (MAX_ROWS) bounds memory/time; beyond it we fail loudly instead of
 * returning silently truncated (wrong) totals.
 */
const PAGE_SIZE = 1000;
export const MAX_ROWS = 100_000;

export async function fetchTransactionRows(
  supabase: Client,
  userId: string,
  filter: { from?: string; to?: string; type?: TransactionType } = {},
): Promise<ServiceResult<AggRow[]>> {
  const rows: AggRow[] = [];
  // Reads up to MAX_ROWS + 1 rows: exactly MAX_ROWS succeeds, one more fails.
  for (let offset = 0; offset <= MAX_ROWS; offset += PAGE_SIZE) {
    let query = supabase
      .from("transactions")
      .select("type, amount, transaction_date, category_id")
      .eq("user_id", userId);
    if (filter.from) query = query.gte("transaction_date", filter.from);
    if (filter.to) query = query.lte("transaction_date", filter.to);
    if (filter.type) query = query.eq("type", filter.type);

    const { data, error } = await query
      .order("transaction_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
    logServiceError("transaction_rows.fetch", error);
    return fail(GENERIC_ERROR);
  }
    rows.push(...data);
    if (rows.length > MAX_ROWS) {
      logServiceError("transaction_rows.max_rows", { code: "MAX_ROWS" });
      return fail(GENERIC_ERROR);
    }
    if (data.length < PAGE_SIZE) return success(rows);
  }
  return fail(GENERIC_ERROR);
}
