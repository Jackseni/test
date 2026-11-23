import type { TransactionType } from "@/types/database";

export const CATEGORY_NOT_FOUND = "La categoría seleccionada no existe.";
export const CATEGORY_TYPE_MISMATCH = "La categoría no corresponde al tipo de transacción.";
export const CATEGORY_IN_USE =
  "No se puede eliminar la categoría porque tiene transacciones asociadas. Elimina o reasigna esas transacciones primero.";

/**
 * Pure rule: the category must exist (already scoped to the user by the query)
 * and its type must equal the transaction type. Returns a Spanish error or null.
 * The DB composite FK enforces the same; this gives a friendly message first.
 */
export function checkCategoryForTransaction(
  category: { type: TransactionType } | null,
  type: TransactionType,
): string | null {
  if (!category) return CATEGORY_NOT_FOUND;
  if (category.type !== type) return CATEGORY_TYPE_MISMATCH;
  return null;
}

/** Pure rule for category deletion (FK is NO ACTION: block while in use). */
export function checkCategoryDeletable(transactionCount: number): string | null {
  return transactionCount > 0 ? CATEGORY_IN_USE : null;
}
