import { z } from "zod";
import { isValidIsoDate } from "@/lib/utils/dates";
import { normalizeAmountInput, parseAmountToCents } from "@/lib/utils/money";
import { transactionTypeSchema } from "./category";
import { noNul } from "./text";

// A single decimal comma is normalized to a dot first, so the output (and what is
// stored) is always the dot form.
export const amountSchema = z
  .string({ error: "Ingresa un monto" })
  .trim()
  .min(1, "Ingresa un monto")
  .transform(normalizeAmountInput)
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Monto inválido. Usa hasta 2 decimales, por ejemplo 10.50 o 10,50")
      .regex(/^\d+(\.\d{1,2})?$/, "Máximo 2 decimales")
      .regex(/^\d{1,12}(\.|$)/, "El monto máximo es 999999999999.99")
      .refine((v) => {
        const cents = parseAmountToCents(v);
        return cents === null || cents > 0;
      }, "El monto debe ser mayor que 0"),
  );

const isoDate = z
  .string({ error: "Fecha inválida" })
  .refine(isValidIsoDate, "Fecha inválida")
  .refine((v) => v >= "2000-01-01" && v <= "2100-12-31", "La fecha debe estar entre 2000 y 2100");

export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  categoryId: z.string({ error: "Selecciona una categoría" }).uuid("Selecciona una categoría"),
  amount: amountSchema,
  description: z
    .string()
    .trim()
    .max(255, "La descripción no puede superar 255 caracteres")
    .refine(noNul, "La descripción contiene caracteres no permitidos"),
  transactionDate: isoDate,
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

// --- Filters / pagination from URL query params --------------------------------

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export type TransactionFilters = {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  categoryId?: string;
  type?: "INCOME" | "EXPENSE";
};

const filterShape = z.object({
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  categoryId: z.string().uuid().optional().catch(undefined),
  type: transactionTypeSchema.optional().catch(undefined),
});

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Never throws: invalid params fall back to defaults / are dropped. */
export function parseTransactionFilters(
  params: Record<string, string | string[] | undefined>,
): TransactionFilters {
  const parsed = filterShape.parse({
    page: first(params.page) ?? 1,
    pageSize: first(params.pageSize) ?? DEFAULT_PAGE_SIZE,
    from: first(params.from) || undefined,
    to: first(params.to) || undefined,
    categoryId: first(params.categoryId) || undefined,
    type: first(params.type) || undefined,
  });
  // If the range is inverted, swap rather than returning nothing.
  if (parsed.from && parsed.to && parsed.from > parsed.to) {
    return { ...parsed, from: parsed.to, to: parsed.from };
  }
  return parsed;
}
