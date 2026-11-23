import { z } from "zod";
import { DEFAULT_TIMEZONE, isValidTimeZone } from "@/lib/utils/dates";

// Treat empty strings (common in .env files) as "not set".
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string | undefined;
};

/** Pure validator (testable). Throws an Error listing invalid variable names only (never values). */
export function parsePublicEnv(raw: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(raw);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))].join(", ");
    throw new Error(`Invalid or missing environment variables: ${names}. See .env.example.`);
  }
  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    siteUrl: result.data.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, ""),
  };
}

/**
 * App time zone for "today"/current month (server-only read; Render runs in UTC).
 * Optional env APP_TIMEZONE (IANA name); invalid or empty falls back to the default.
 */
export function resolveAppTimezone(raw: string | undefined): string {
  const v = raw?.trim();
  return v && isValidTimeZone(v) ? v : DEFAULT_TIMEZONE;
}

export function getAppTimezone(): string {
  return resolveAppTimezone(process.env.APP_TIMEZONE);
}

/**
 * Lazy (called at request time, never at import/build time), so `next build`
 * works without env vars. NEXT_PUBLIC_* are referenced statically so Next can
 * inline them into the client bundle.
 */
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
