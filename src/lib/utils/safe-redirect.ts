/**
 * Returns `next` only if it is a same-origin, relative path; otherwise `fallback`.
 * Blocks absolute URLs, protocol-relative (//host), backslash tricks and control chars.
 * The check is repeated AFTER URL normalization, because dot-segments can collapse
 * into a protocol-relative path (e.g. `/..//evil.com` -> `//evil.com`).
 */
export function sanitizeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "http://internal.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    const result = `${url.pathname}${url.search}${url.hash}`;
    if (!result.startsWith("/") || result.startsWith("//") || result.startsWith("/\\")) return fallback;
    return result;
  } catch {
    return fallback;
  }
}
