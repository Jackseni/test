import { z } from "zod";
import { noNul } from "./text";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES, { error: "Tipo inválido" });

export const CATEGORY_COLORS = [
  "#10b981",
  "#059669",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#64748b",
] as const;

const name = z
  .string({ error: "Ingresa un nombre" })
  .trim()
  .min(1, "Ingresa un nombre")
  .max(50, "El nombre no puede superar 50 caracteres")
  .refine(noNul, "El nombre contiene caracteres no permitidos");

const color = z.string({ error: "Selecciona un color" }).regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");

// Whitelisted fields only; user_id/id are never accepted from the client.
export const categoryCreateSchema = z.object({ name, type: transactionTypeSchema, color });

// Type is immutable after creation (transactions reference (id, user_id, type)).
export const categoryUpdateSchema = z.object({ name, color });

export const idSchema = z.string({ error: "Identificador inválido" }).uuid("Identificador inválido");

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
