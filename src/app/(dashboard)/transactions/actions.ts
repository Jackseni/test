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
import { idSchema } from "@/lib/validations/category";
import { transactionInputSchema } from "@/lib/validations/transaction";
import { createTransaction, deleteTransaction, updateTransaction } from "@/services/transactions";

function revalidateAll() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/budgets");
}

export async function createTransactionAction(input: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT, fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await createTransaction(auth.supabase, auth.userId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateAll();
  return { ok: true };
}

export async function updateTransactionAction(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: INVALID_INPUT };
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT, fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await updateTransaction(auth.supabase, auth.userId, parsedId.data, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateAll();
  return { ok: true };
}

export async function deleteTransactionAction(id: unknown): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: AUTH_REQUIRED };
  if (mutationLimited(auth.userId)) return { ok: false, error: RATE_LIMITED };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: INVALID_INPUT };

  const result = await deleteTransaction(auth.supabase, auth.userId, parsedId.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateAll();
  return { ok: true };
}
