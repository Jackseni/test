"use server";

import { revalidatePath } from "next/cache";
import {
  AUTH_REQUIRED,
  fieldErrorsFrom,
  INVALID_INPUT,
  mutationLimited,
  RATE_LIMITED,
  requireUser,
  type ActionResult,
} from "@/lib/actions";
import { categoryCreateSchema, categoryUpdateSchema, idSchema } from "@/lib/validations/category";
import { createCategory, deleteCategory, updateCategory } from "@/services/categories";

// Every action: authenticate -> rate limit -> validate with Zod -> service (scoped by user_id).

export async function createCategoryAction(input: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT, fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await createCategory(auth.supabase, auth.userId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/reports");
  return { ok: true };
}

export async function updateCategoryAction(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsedId = idSchema.safeParse(id);
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: INVALID_INPUT };
  if (!parsed.success) return { ok: false, error: INVALID_INPUT, fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await updateCategory(auth.supabase, auth.userId, parsedId.data, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteCategoryAction(id: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: INVALID_INPUT };

  const result = await deleteCategory(auth.supabase, auth.userId, parsedId.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/reports");
  return { ok: true };
}
