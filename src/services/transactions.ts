import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { centsToNumeric, parseAmountToCents } from "@/lib/utils/money";
import { buildPageInfo, type PageInfo } from "@/lib/utils/pagination";
import { checkCategoryForTransaction } from "@/lib/utils/transaction-rules";
import type { TransactionFilters, TransactionInput } from "@/lib/validations/transaction";
import type { Database } from "@/types/database";
import { getCategory } from "./categories";
import { logServiceError } from "@/lib/log";
import { fail, GENERIC_ERROR, NOT_FOUND, success, type ServiceResult } from "./result";

type Client = SupabaseClient<Database>;
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export type TransactionPage = { items: Transaction[]; pageInfo: PageInfo };

export async function listTransactions(
  supabase: Client,
  userId: string,
  filters: TransactionFilters,
): Promise<ServiceResult<TransactionPage>> {
  const info = buildPageInfo(filters.page, filters.pageSize, 0);
  let query = supabase.from("transactions").select("*", { count: "exact" }).eq("user_id", userId);
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.type) query = query.eq("type", filters.type);

  const { data, count, error } = await query
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true }) // final tie-breaker: stable pagination
    .range(info.rangeFrom, info.rangeTo);
  if (error) {
    logServiceError("transactions.list", error);
    return fail(GENERIC_ERROR);
  }
  return success({ items: data ?? [], pageInfo: buildPageInfo(filters.page, filters.pageSize, count ?? 0) });
}

async function validateCategory(supabase: Client, userId: string, input: TransactionInput): Promise<string | null> {
  const category = await getCategory(supabase, userId, input.categoryId);
  if (!category.ok) return category.error;
  return checkCategoryForTransaction(category.data, input.type);
}

function toRow(input: TransactionInput) {
  const cents = parseAmountToCents(input.amount);
  if (cents === null || cents <= 0) return null;
  return {
    category_id: input.categoryId,
    type: input.type,
    amount: centsToNumeric(cents),
    description: input.description,
    transaction_date: input.transactionDate,
  };
}

export async function createTransaction(
  supabase: Client,
  userId: string,
  input: TransactionInput,
): Promise<ServiceResult<Transaction>> {
  const row = toRow(input);
  if (!row) return fail("Monto inválido.");
  const invalid = await validateCategory(supabase, userId, input);
  if (invalid) return fail(invalid);

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...row, user_id: userId })
    .select()
    .single();
  if (error) {
    logServiceError("transactions.create", error);
    return fail(GENERIC_ERROR);
  }
  return success(data);
}

export async function updateTransaction(
  supabase: Client,
  userId: string,
  id: string,
  input: TransactionInput,
): Promise<ServiceResult<Transaction>> {
  const row = toRow(input);
  if (!row) return fail("Monto inválido.");

  // Ownership check first so foreign ids get a uniform "not found".
  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) {
    logServiceError("transactions.update_lookup", existingError);
    return fail(GENERIC_ERROR);
  }
  if (!existing) return fail(NOT_FOUND);

  const invalid = await validateCategory(supabase, userId, input);
  if (invalid) return fail(invalid);

  const { data, error } = await supabase
    .from("transactions")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) {
    logServiceError("transactions.update", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  return success(data);
}

export async function deleteTransaction(supabase: Client, userId: string, id: string): Promise<ServiceResult<null>> {
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    logServiceError("transactions.delete", error);
    return fail(GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  return success(null);
}
