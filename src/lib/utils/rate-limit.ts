/**
 * Minimal fixed-window in-memory rate limiter. Per-process only: good enough as
 * a brute-force speed bump on a single Render instance; use a shared store
 * (Redis/Upstash) if scaling horizontally. Supabase Auth also rate-limits server-side.
 */
type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const MAX_KEYS = 10_000;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMs: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now: number = Date.now(),
): RateLimitResult {
  if (store.size > MAX_KEYS) {
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    if (store.size > MAX_KEYS) store.clear(); // hard cap against memory growth
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  return { ok: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

export function resetRateLimits() {
  store.clear();
}
