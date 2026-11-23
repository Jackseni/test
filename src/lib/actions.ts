import "server-only";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

export type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const AUTH_REQUIRED = "Tu sesión expiró. Inicia sesión de nuevo.";
export const INVALID_INPUT = "Revisa los datos ingresados.";
export const RATE_LIMITED = "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";

/** Returns the authenticated user and a per-request client, or null if anonymous. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** First Zod message per field path. */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Light per-user mutation limit (per-instance, best effort). */
export function mutationLimited(userId: string): boolean {
  return !rateLimit(`mutation:${userId}`, { limit: 60, windowMs: 60_000 }).ok;
}
