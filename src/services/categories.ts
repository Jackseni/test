import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkCategoryDeletable } from "@/lib/utils/transaction-rules";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/validations/category";
import type { Database, TransactionType } from "@/types/database";
import { logServiceError } from "@/lib/log";
import { fail, GENERIC_ERROR, NOT_FOUND, success, type ServiceResult } from "./result";

type Client = SupabaseClient<Database>;
export type Category = Database["public"]["Tables"]["categories"]["Row"];

const DUPLICATE = "Ya existe una categoría con ese nombre y tipo.";

// All queries filter by user_id explicitly; RLS is only the backstop.

export async function listCategories(
  supabase: Client,
  userId: string,
  type?: TransactionType,
): Promise<ServiceResult<Category[]>> {
  let query = supabase.from("categories").select("*").eq("user_id", userId);
  if (type) query = query.eq("type", type);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) {
    logServiceError("categories.list", error);
    return fail(GENERIC_ERROR);
  }
  return success(data ?? []);
}

export async function getCategory(supabase: Client, userId: string, id: string): Promise<ServiceResult<Category | null>> {
  const { data, error } = await supabase.from("categories").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) {
    logServiceError("categories.get", error);
    return fail(GENERIC_ERROR);
  }
  return success(data);
}

export async function createCategory(
  supabase: Client,
  userId: string,
  input: CategoryCreateInput,
): Promise<ServiceResult<Category>> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: input.name, type: input.type, color: input.color })
    .select()
    .single();
  if (error) {
    if (error.code !== "23505") logServiceError("categories.create", error);
    return fail(error.code === "23505" ? DUPLICATE : GENERIC_ERROR);
  }
  return success(data);
}

export async function updateCategory(
  supabase: Client,
  userId: string,
  id: string,
  input: CategoryUpdateInput,
): Promise<ServiceResult<Category>> {
  const { data, error } = await supabase
    .from("categories")
    .update({ name: input.name, color: input.color })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) {
    if (error.code !== "23505") logServiceError("categories.update", error);
    return fail(error.code === "23505" ? DUPLICATE : GENERIC_ERROR);
  }
  if (!data) return fail(NOT_FOUND);
  return success(data);
}

/**
 * transactions -> categories is a NO ACTION FK, so a category in use cannot be
 * deleted. Decision: block with a friendly message (no silent reassign/cascade,
 * which would destroy or rewrite financial history).
 */
export async function deleteCategory(supabase: Client, userId: string, id: string): Promise<ServiceResult<null>> {
  const existing = await getCategory(supabase, userId, id);
  if (!existing.ok) return existing;
  if (!existing.data) return fail(NOT_FOUND);

  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("user_id", userId);
  if (countError) {
    logServiceError("categories.delete_count", countError);
    return fail(GENERIC_ERROR);
  }
  const blocked = checkCategoryDeletable(count ?? 0);
  if (blocked) return fail(blocked);

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    // 23503: a transaction was created between the check and the delete.
    if (error.code !== "23503") logServiceError("categories.delete", error);
    return fail(error.code === "23503" ? checkCategoryDeletable(1)! : GENERIC_ERROR);
  }
  return success(null);
}
