import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

const validRegister = {
  fullName: "  Ana Pérez ",
  email: "  ANA@Example.COM ",
  password: "supersecret1",
  confirmPassword: "supersecret1",
};

describe("registerSchema", () => {
  it("accepts valid input and normalizes email/name", () => {
    const r = registerSchema.parse(validRegister);
    expect(r.email).toBe("ana@example.com");
    expect(r.fullName).toBe("Ana Pérez");
  });
  it("rejects short passwords", () => {
    expect(registerSchema.safeParse({ ...validRegister, password: "short", confirmPassword: "short" }).success).toBe(false);
  });
  it("rejects passwords over 72 chars", () => {
    const p = "a".repeat(73);
    expect(registerSchema.safeParse({ ...validRegister, password: p, confirmPassword: p }).success).toBe(false);
  });
  it("rejects mismatched confirmation", () => {
    const r = registerSchema.safeParse({ ...validRegister, confirmPassword: "different123" });
    expect(r.success).toBe(false);
  });
  it("rejects invalid email and overlong name", () => {
    expect(registerSchema.safeParse({ ...validRegister, email: "nope" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, fullName: "x".repeat(101) }).success).toBe(false);
  });
  it("strips unknown fields (no mass assignment)", () => {
    const r = registerSchema.parse({ ...validRegister, user_id: "evil", role: "admin" });
    expect(r).not.toHaveProperty("user_id");
    expect(r).not.toHaveProperty("role");
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("rejects empty password and overlong email", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: `${"a".repeat(250)}@b.co`, password: "x" }).success).toBe(false);
  });
});

describe("forgot/reset schemas", () => {
  it("validates email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
  });
  it("requires matching strong password", () => {
    expect(resetPasswordSchema.safeParse({ password: "longenough1", confirmPassword: "longenough1" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "longenough1", confirmPassword: "other" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success).toBe(false);
  });
});
