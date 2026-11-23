import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/** Validated only when called (e.g. by the admin client). Never import from client code. */
export function getServerEnv(raw: Record<string, string | undefined> = process.env) {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY.");
  }
  return result.data;
}
