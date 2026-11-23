import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase session cookies for the request and returns the
 * verified user. Uses getUser() (validates the JWT with Supabase), never
 * getSession(), for auth decisions.
 */
export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cache-control hints from @supabase/ssr (prevent CDN caching of Set-Cookie).
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

/** Redirect that preserves any refreshed session cookies set on `from`. */
export function redirectWithCookies(request: NextRequest, pathname: string, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  redirect.headers.set("Cache-Control", from.headers.get("Cache-Control") ?? "no-store");
  return redirect;
}
