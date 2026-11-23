import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

const ok = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("parsePublicEnv", () => {
  it("parses valid env; site url optional", () => {
    expect(parsePublicEnv(ok)).toEqual({
      supabaseUrl: "https://abc.supabase.co",
      supabaseAnonKey: "anon-key",
      siteUrl: undefined,
    });
  });
  it("treats empty site url as unset and strips trailing slash", () => {
    expect(parsePublicEnv({ ...ok, NEXT_PUBLIC_SITE_URL: "" }).siteUrl).toBeUndefined();
    expect(parsePublicEnv({ ...ok, NEXT_PUBLIC_SITE_URL: "https://app.example.com/" }).siteUrl).toBe(
      "https://app.example.com",
    );
  });
  it("throws naming missing/invalid vars without leaking values", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => parsePublicEnv({ ...ok, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
    try {
      parsePublicEnv({ ...ok, NEXT_PUBLIC_SUPABASE_URL: "secret-bad-value" });
    } catch (e) {
      expect((e as Error).message).not.toContain("secret-bad-value");
    }
  });
});

describe("getServerEnv", () => {
  it("requires the service role key only when called", () => {
    expect(() => getServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(getServerEnv({ SUPABASE_SERVICE_ROLE_KEY: "k" }).SUPABASE_SERVICE_ROLE_KEY).toBe("k");
  });
});
