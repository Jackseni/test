import { describe, expect, it } from "vitest";
import { sanitizeNext } from "@/lib/utils/safe-redirect";

describe("sanitizeNext", () => {
  it("allows same-origin relative paths", () => {
    expect(sanitizeNext("/reset-password")).toBe("/reset-password");
    expect(sanitizeNext("/transactions?page=2#x")).toBe("/transactions?page=2#x");
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/path\nHeader: x",
    "/\t/evil.com",
    "",
  ])("rejects %j", (v) => {
    expect(sanitizeNext(v)).toBe("/dashboard");
  });
  it("falls back on null/undefined/overlong and honors custom fallback", () => {
    expect(sanitizeNext(null)).toBe("/dashboard");
    expect(sanitizeNext(undefined, "/login")).toBe("/login");
    expect(sanitizeNext(`/${"a".repeat(3000)}`)).toBe("/dashboard");
  });
});
