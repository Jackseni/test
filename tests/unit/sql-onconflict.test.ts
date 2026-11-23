import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(resolve(process.cwd(), "supabase/migrations", f), "utf8");

describe("handle_new_user vs expression unique index", () => {
  it("does not use ON CONFLICT (user_id, name, type) when uniqueness is an expression index", () => {
    const tables = read("20260101000001_create_tables.sql");
    const fn = read("20260101000002_functions_triggers.sql");
    const exprIndex = /unique index categories_user_name_type_key[\s\S]*?lower\(btrim\(name\)\)/.test(tables);
    const columnTarget = /on conflict \(user_id, name, type\)/i.test(fn);
    // Postgres: "no unique or exclusion constraint matching the ON CONFLICT specification" -> every signup fails.
    expect(exprIndex && columnTarget).toBe(false);
  });
});
