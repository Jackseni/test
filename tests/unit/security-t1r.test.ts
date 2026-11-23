import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeNext } from "@/lib/utils/safe-redirect";

const sql = (f: string) => readFileSync(path.resolve(__dirname, "../../supabase/migrations", f), "utf8");
const rls = sql("20260101000003_rls_policies.sql");

describe("T1R: sanitizeNext never yields a protocol-relative result", () => {
  it.each(["/..//evil.com", "/.//evil.com", "/a/..//evil.com", "/a/../..//evil.com"])(
    "dot-segment normalization cannot produce //host: %j",
    (v) => {
      const out = sanitizeNext(v);
      expect(out.startsWith("//")).toBe(false);
    },
  );
});

describe("T1R: RLS migration hardening", () => {
  it("enables RLS and defines 4 policies for each table", () => {
    for (const t of ["profiles", "categories", "transactions", "budgets"]) {
      expect(rls).toMatch(new RegExp(String.raw`alter table public\.${t}\s+enable row level security`));
      for (const op of ["select", "insert", "update", "delete"]) {
        expect(rls).toMatch(new RegExp(String.raw`create policy ${t}_${op}_own on public\.${t} for ${op}`));
      }
    }
  });
  it("UPDATE policies have WITH CHECK", () => {
    expect((rls.match(/for update to authenticated\s+using \([^;]*with check/g) ?? []).length).toBe(4);
  });
  it("revokes default Supabase privileges (TRUNCATE/REFERENCES/TRIGGER bypass RLS) from authenticated before granting DML", () => {
    // Supabase default privileges grant ALL (incl. TRUNCATE) to authenticated; TRUNCATE ignores RLS.
    expect(rls).toMatch(/revoke all on [^;]*from[^;]*authenticated/i);
  });
});
