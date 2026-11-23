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
import { budgetCreateSchema, budgetUpdateSchema } from "@/lib/validations/budget";
import { idSchema } from "@/lib/validations/category";
import { createBudget, deleteBudget, updateBudgetAmount } from "@/services/budgets";

// Every action: authenticate -> rate limit -> validate with Zod -> service (scoped by user_id).

function refresh() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function createBudgetAction(input: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsed = budgetCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT, fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await createBudget(auth.supabase, auth.userId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true };
}

export async function updateBudgetAction(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsedId = idSchema.safeParse(id);
  const parsed = budgetUpdateSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: INVALID_INPUT };
  if (!parsed.success) return { ok: false, error: INVALID_INPUT, fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await updateBudgetAmount(auth.supabase, auth.userId, parsedId.data, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true };
}

export async function deleteBudgetAction(id: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: INVALID_INPUT };

  const result = await deleteBudget(auth.supabase, auth.userId, parsedId.data);
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true };
}
