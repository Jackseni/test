import "server-only";

/**
 * Minimal diagnostic logger for the data layer. It is the ONLY place in src
 * allowed to use console.*.
 *
 * Logs: scope + Postgres/PostgREST error code (e.g. PGRST205, 23505) and, in
 * development only, the error message. Never logs user ids, emails, row data,
 * payloads, tokens or keys: only whitelisted fields are read from the error.
 */
export function logServiceError(scope: string, error: unknown): void {
  const code = readString(error, "code");
  if (process.env.NODE_ENV === "development") {
    console.error(`[${scope}]`, { code, message: readString(error, "message") });
  } else {
    console.error(`[${scope}]`, { code });
  }
}

function readString(value: unknown, key: "code" | "message"): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field.slice(0, 300) : undefined;
}
