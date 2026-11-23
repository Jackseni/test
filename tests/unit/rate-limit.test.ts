import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/utils/rate-limit";

const opts = { limit: 3, windowMs: 1000 };

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit then blocks", () => {
    expect(rateLimit("k", opts, 0).ok).toBe(true);
    expect(rateLimit("k", opts, 1).ok).toBe(true);
    const third = rateLimit("k", opts, 2);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
    const blocked = rateLimit("k", opts, 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(997);
  });
  it("resets after the window", () => {
    for (let i = 0; i < 4; i++) rateLimit("k", opts, i);
    expect(rateLimit("k", opts, 1000).ok).toBe(true);
  });
  it("tracks keys independently", () => {
    for (let i = 0; i < 4; i++) rateLimit("a", opts, i);
    expect(rateLimit("b", opts, 5).ok).toBe(true);
  });
});
