import type { NextRequest } from "next/server";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";
import { isGuestOnlyPath, isPrivatePath } from "@/lib/routes";

// Optimistic gate + session refresh. Real authorization happens again in every
// server action / data access (getUser()) and in RLS.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return redirectWithCookies(request, user ? "/dashboard" : "/login", response);
  }
  if (!user && isPrivatePath(pathname)) {
    return redirectWithCookies(request, "/login", response);
  }
  if (user && isGuestOnlyPath(pathname)) {
    return redirectWithCookies(request, "/dashboard", response);
  }
  // Private pages must never be stored by shared caches/CDNs.
  if (isPrivatePath(pathname)) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
