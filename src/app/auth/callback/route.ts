import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/utils/safe-redirect";

// Email confirmation / password recovery landing: exchanges the one-time code
// for a session, then redirects to a validated same-origin path.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // Production requires an explicit site URL (enforced at request time, not build time).
  const configured = getPublicEnv().siteUrl;
  if (!configured && process.env.NODE_ENV === "production") {
    return new NextResponse("Configuración del servidor incompleta.", { status: 500 });
  }
  const base = configured ?? origin;
  const next = sanitizeNext(searchParams.get("next"), "/dashboard");
  const code = searchParams.get("code");

  if (code && code.length <= 512) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }
  return NextResponse.redirect(`${base}/login?error=callback`);
}
