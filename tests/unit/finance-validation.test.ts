import { describe, expect, it } from "vitest";
import { categoryCreateSchema, categoryUpdateSchema, idSchema } from "@/lib/validations/category";
import { amountSchema, parseTransactionFilters, transactionInputSchema } from "@/lib/validations/transaction";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const valid = { type: "EXPENSE", categoryId: UUID, amount: "10.50", description: "Café", transactionDate: "2026-03-05" };

describe("amountSchema", () => {
  it.each(["0.01", "1", "10.5", "999999999999.99"])("accepts %s", (v) => {
    expect(amountSchema.safeParse(v).success).toBe(true);
  });
  it.each(["0", "0.00", "-5", "1.234", "1000000000000", "1000000000000.00", "abc", "", "1,5,0", "NaN"])(
    "rejects %j",
    (v) => {
      expect(amountSchema.safeParse(v).success).toBe(false);
    },
  );
  it("rejects non-strings", () => {
    expect(amountSchema.safeParse(10).success).toBe(false);
  });
  it("gives specific messages", () => {
    expect(amountSchema.safeParse("1.234").error?.issues[0].message).toBe("Máximo 2 decimales");
    expect(amountSchema.safeParse("0").error?.issues[0].message).toBe("El monto debe ser mayor que 0");
  });
});

describe("transactionInputSchema", () => {
  it("accepts a valid payload", () => {
    expect(transactionInputSchema.safeParse(valid).success).toBe(true);
  });
  it("strips unknown fields such as user_id (mass assignment)", () => {
    const r = transactionInputSchema.safeParse({ ...valid, user_id: UUID, id: UUID });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data).sort()).toEqual(["amount", "categoryId", "description", "transactionDate", "type"]);
  });
  it.each([
    ["bad uuid", { categoryId: "123" }],
    ["bad type", { type: "TRANSFER" }],
    ["invalid date", { transactionDate: "2026-02-30" }],
    ["non ISO date", { transactionDate: "05/03/2026" }],
    ["date out of range", { transactionDate: "1999-12-31" }],
    ["long description", { description: "x".repeat(256) }],
    ["zero amount", { amount: "0" }],
    ["negative amount", { amount: "-1" }],
    ["3 decimals", { amount: "1.001" }],
    ["huge amount", { amount: "99999999999999999" }],
  ])("rejects %s", (_name, patch) => {
    expect(transactionInputSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("accepts 255-char description and trims it", () => {
    expect(transactionInputSchema.safeParse({ ...valid, description: "x".repeat(255) }).success).toBe(true);
    const r = transactionInputSchema.parse({ ...valid, description: "  hola  " });
    expect(r.description).toBe("hola");
  });
});

describe("category schemas", () => {
  const ok = { name: "Comida", type: "EXPENSE", color: "#10b981" };
  it("accepts valid and rejects bad input", () => {
    expect(categoryCreateSchema.safeParse(ok).success).toBe(true);
    expect(categoryCreateSchema.safeParse({ ...ok, name: "   " }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...ok, name: "x".repeat(51) }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...ok, color: "red" }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...ok, color: "#12345" }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...ok, type: "X" }).success).toBe(false);
  });
  it("update ignores type and user_id", () => {
    const r = categoryUpdateSchema.parse({ ...ok, user_id: UUID });
    expect(Object.keys(r).sort()).toEqual(["color", "name"]);
  });
  it("validates ids", () => {
    expect(idSchema.safeParse(UUID).success).toBe(true);
    expect(idSchema.safeParse("x").success).toBe(false);
  });
});

describe("parseTransactionFilters", () => {
  it("applies defaults", () => {
    expect(parseTransactionFilters({})).toEqual({ page: 1, pageSize: 10 });
  });
  it("parses valid params and takes first of arrays", () => {
    const f = parseTransactionFilters({ page: "3", pageSize: ["20", "5"], from: "2026-01-01", to: "2026-01-31", categoryId: UUID, type: "INCOME" });
    expect(f).toEqual({ page: 3, pageSize: 20, from: "2026-01-01", to: "2026-01-31", categoryId: UUID, type: "INCOME" });
  });
  it("falls back on garbage without throwing", () => {
    const f = parseTransactionFilters({ page: "-2", pageSize: "500", from: "nope", categoryId: "x", type: "Z" });
    expect(f).toEqual({ page: 1, pageSize: 10 });
    expect(parseTransactionFilters({ page: "abc" }).page).toBe(1);
  });
  it("caps pageSize at 50", () => {
    expect(parseTransactionFilters({ pageSize: "50" }).pageSize).toBe(50);
    expect(parseTransactionFilters({ pageSize: "51" }).pageSize).toBe(10);
  });
  it("swaps an inverted range", () => {
    const f = parseTransactionFilters({ from: "2026-02-01", to: "2026-01-01" });
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-02-01");
  });
});
