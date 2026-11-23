import { z } from "zod";
import { amountSchema } from "./transaction";

const month = z
  .number({ error: "Mes inválido" })
  .int("Mes inválido")
  .min(1, "Mes inválido")
  .max(12, "Mes inválido");
const year = z
  .number({ error: "Año inválido" })
  .int("Año inválido")
  .min(2000, "El año debe estar entre 2000 y 2100")
  .max(2100, "El año debe estar entre 2000 y 2100");

// Whitelisted fields only; user_id/id are never accepted from the client.
export const budgetCreateSchema = z.object({
  categoryId: z.string({ error: "Selecciona una categoría" }).uuid("Selecciona una categoría"),
  amount: amountSchema,
  month,
  year,
});

// Only the amount is editable (category and period identify the budget).
export const budgetUpdateSchema = z.object({ amount: amountSchema });

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;

export type BudgetPeriod = { month: number; year: number };

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Never throws: invalid or missing params fall back to `today`'s month/year. */
export function parseBudgetPeriod(
  params: Record<string, string | string[] | undefined>,
  today: { year: number; month: number },
): BudgetPeriod {
  const parsed = z
    .object({
      month: z.coerce.number().pipe(month),
      year: z.coerce.number().pipe(year),
    })
    .safeParse({ month: first(params.month), year: first(params.year) });
  return parsed.success ? parsed.data : { month: today.month, year: today.year };
}
