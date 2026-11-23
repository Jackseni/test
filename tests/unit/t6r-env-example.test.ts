import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

describe("T6R .env.example contains no secrets", () => {
  const env = read(".env.example");
  it("no Supabase key prefixes, JWTs or supabase.co hosts", () => {
    expect(env).not.toContain("sb_secret_");
    expect(env).not.toContain("sb_publishable_");
    expect(env).not.toMatch(/eyJ[A-Za-z0-9_-]{5,}/);
    expect(env).not.toMatch(/\.supabase\.co/i);
  });
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"])(
    "%s has an empty value",
    (name) => {
      const m = env.match(new RegExp(`^\s*${name}\s*=(.*)$`, "m"));
      expect(m, `${name} should be documented`).not.toBeNull();
      expect((m?.[1] ?? "").trim().replace(/^["']|["']$/g, "")).toBe("");
    },
  );
});

describe("T6R secret hygiene", () => {
  it(".gitignore ignores .env* but allows .env.example", () => {
    const gi = read(".gitignore").split(/\r?\n/).map((l) => l.trim());
    expect(gi).toContain(".env*");
    expect(gi).toContain("!.env.example");
  });
  it(".env.local is not tracked by git (when a git repo exists)", () => {
    if (!existsSync(join(ROOT, ".git"))) return;
    const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
    expect(tracked.split(/\r?\n/)).not.toContain(".env.local");
  });
  it("no file under public/ src/ tests/ supabase/ docs/ or README contains sb_secret_", () => {
    const needle = "sb_" + "secret_";
    const offenders: string[] = [];
    const walk = (p: string) => {
      const abs = join(ROOT, p);
      if (!existsSync(abs)) return;
      if (statSync(abs).isDirectory()) {
        for (const e of readdirSync(abs)) {
          if (e === "node_modules" || e === ".next" || e === "test-results" || e === "playwright-report") continue;
          walk(join(p, e));
        }
      } else if (p.replace(/\\/g, "/") !== "tests/unit/t6r-env-example.test.ts" && !/\.(png|jpe?g|ico|webp|woff2?)$/i.test(p) && readFileSync(abs, "utf8").includes(needle)) {
        offenders.push(p);
      }
    };
    for (const d of ["public", "src", "tests", "supabase", "docs", "README.md"]) walk(d);
    expect(offenders).toEqual([]);
  });
});
