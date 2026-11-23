import { describe, expect, it } from "vitest";
import { savingsRatePercent } from "@/lib/utils/savings-rate";
import { displayName, firstName, initialsOf } from "@/lib/utils/display-name";

describe("savingsRatePercent", () => {
  it("returns null when there is no income", () => {
    expect(savingsRatePercent(0, 0)).toBeNull();
    expect(savingsRatePercent(0, 5000)).toBeNull();
    expect(savingsRatePercent(-100, 0)).toBeNull();
  });
  it("computes (income-expense)/income", () => {
    expect(savingsRatePercent(100000, 25000)).toBe(75);
    expect(savingsRatePercent(100000, 0)).toBe(100);
    expect(savingsRatePercent(100000, 100000)).toBe(0);
  });
  it("clamps to 0 when expenses exceed income", () => {
    expect(savingsRatePercent(100000, 150000)).toBe(0);
  });
  it("rounds to the nearest integer", () => {
    expect(savingsRatePercent(300, 100)).toBe(67);
    expect(savingsRatePercent(300, 200)).toBe(33);
  });
  it("rejects non-finite input", () => {
    expect(savingsRatePercent(Number.NaN, 1)).toBeNull();
  });
});

describe("display name helpers", () => {
  it("prefers full_name, falls back to email", () => {
    expect(displayName({ full_name: "  Ana Pérez " }, "a@b.com")).toBe("Ana Pérez");
    expect(displayName({ full_name: "" }, "a@b.com")).toBe("a@b.com");
    expect(displayName(undefined, "a@b.com")).toBe("a@b.com");
    expect(displayName({ full_name: 42 }, "a@b.com")).toBe("a@b.com");
  });
  it("builds initials and first names", () => {
    expect(initialsOf("Ana Pérez")).toBe("AP");
    expect(initialsOf("ana@x.com")).toBe("AN");
    expect(initialsOf("maria.lopez@x.com")).toBe("ML");
    expect(firstName("Ana Pérez")).toBe("Ana");
    expect(firstName("ana@x.com")).toBe("ana");
  });
});
