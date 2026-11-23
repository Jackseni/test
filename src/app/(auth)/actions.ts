"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export type ActionState = { ok: boolean; message?: string; error?: string };

const RATE_LIMITED = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const INVALID_INPUT = "Revisa los datos ingresados.";

/**
 * The first x-forwarded-for entry is client-controlled (spoofable). The platform
 * proxy appends the real peer address, so we use the RIGHTMOST entry.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const parts = h.get("x-forwarded-for")?.split(",").map((p) => p.trim()).filter(Boolean);
  return parts?.[parts.length - 1] || h.get("x-real-ip") || "unknown";
}

async function siteUrl(): Promise<string> {
  const configured = getPublicEnv().siteUrl;
  if (configured) return configured;
  // Production must not derive links from request headers (host-header poisoning).
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * Limits per IP and per target email (login/register/reset).
 * Trade-off: the email-keyed limit lets an attacker deliberately lock a victim out
 * of login for the window (15 min). Accepted to throttle credential stuffing;
 * the in-memory store is also per-instance (best effort).
 */
async function limited(action: string, email?: string): Promise<boolean> {
  const ip = await clientIp();
  const byIp = rateLimit(`${action}:ip:${ip}`, { limit: 20, windowMs: 15 * 60_000 });
  const byEmail = email
    ? rateLimit(`${action}:email:${email}`, { limit: 5, windowMs: 15 * 60_000 })
    : { ok: true };
  return !byIp.ok || !byEmail.ok;
}

export async function signUp(input: unknown): Promise<ActionState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };
  const { email, password, fullName } = parsed.data;
  if (await limited("register", email)) return { ok: false, error: RATE_LIMITED };

  const supabase = await createClient();
  // SECURITY: email confirmation MUST stay enabled in Supabase Auth settings.
  // Otherwise signUp returns a session and the "no user enumeration" response
  // (and email ownership verification) no longer holds.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) return { ok: false, error: "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo." };
  if (data.session) redirect("/dashboard");

  // Same response whether or not the email already exists (no user enumeration).
  return {
    ok: true,
    message: "Si los datos son válidos, recibirás un correo para confirmar tu cuenta.",
  };
}

export async function signIn(input: unknown): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };
  const { email, password } = parsed.data;
  if (await limited("login", email)) return { ok: false, error: RATE_LIMITED };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Correo o contraseña incorrectos." };

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(input: unknown): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };
  const { email } = parsed.data;
  if (await limited("reset", email)) return { ok: false, error: RATE_LIMITED };

  const supabase = await createClient();
  // Result intentionally ignored: always respond identically (no user enumeration).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });

  return {
    ok: true,
    message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
  };
}

export async function updatePassword(input: unknown): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "El enlace expiró. Solicita uno nuevo." };
  if (await limited("update-password", user.id)) return { ok: false, error: RATE_LIMITED };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "No se pudo actualizar la contraseña. Inténtalo de nuevo." };

  redirect("/dashboard");
}
