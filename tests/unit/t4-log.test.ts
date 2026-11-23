import { afterEach, describe, expect, it, vi } from "vitest";
import { logServiceError } from "@/lib/log";

const SECRET_ERROR = {
  code: "PGRST205",
  message: "Could not find the table 'public.x'",
  details: "user 3f2a-uuid email a@b.com",
  hint: "token abc",
  payload: { amount: "10.00" },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logServiceError", () => {
  it("in production logs only scope and code", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServiceError("dashboard.recent", SECRET_ERROR);
    expect(spy).toHaveBeenCalledTimes(1);
    const out = JSON.stringify(spy.mock.calls[0]);
    expect(out).toContain("dashboard.recent");
    expect(out).toContain("PGRST205");
    expect(out).not.toContain("Could not find");
    expect(out).not.toContain("a@b.com");
    expect(out).not.toContain("3f2a-uuid");
    expect(out).not.toContain("10.00");
    expect(out).not.toContain("token");
  });

  it("in development adds the message but never details/hint/payload", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServiceError("categories.list", SECRET_ERROR);
    const out = JSON.stringify(spy.mock.calls[0]);
    expect(out).toContain("PGRST205");
    expect(out).toContain("Could not find the table");
    expect(out).not.toContain("a@b.com");
    expect(out).not.toContain("3f2a-uuid");
    expect(out).not.toContain("10.00");
    expect(out).not.toContain("token abc");
  });

  it("tolerates non-object errors", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => logServiceError("x", null)).not.toThrow();
    expect(() => logServiceError("x", "boom")).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
