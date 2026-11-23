export const PRIVATE_PREFIXES = ["/dashboard", "/transactions", "/categories", "/budgets", "/reports"] as const;
export const GUEST_ONLY_PATHS = ["/login", "/register"] as const;

const matches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export const isPrivatePath = (pathname: string) => PRIVATE_PREFIXES.some((p) => matches(pathname, p));
export const isGuestOnlyPath = (pathname: string) => GUEST_ONLY_PATHS.some((p) => matches(pathname, p));
