import { describe, expect, it } from "vitest";
import { displayName, firstName, initialsOf } from "@/lib/utils/display-name";
import { savingsRatePercent } from "@/lib/utils/savings-rate";
import { segmentProportions } from "@/lib/utils/segments";

describe("T6R savingsRatePercent", () => {
  it("zero income -> null (never divides by zero)", () => {
    expect(savingsRatePercent(0, 0)).toBeNull();
    expect(savingsRatePercent(0, 5000)).toBeNull();
    expect(savingsRatePercent(-100, 0)).toBeNull();
    expect(savingsRatePercent(Number.NaN, 0)).toBeNull();
  });
  it("expenses > income clamps to 0", () => {
    expect(savingsRatePercent(1000, 5000)).toBe(0);
  });
  it("normal and rounding", () => {
    expect(savingsRatePercent(100000, 25000)).toBe(75);
    expect(savingsRatePercent(3, 1)).toBe(67);
    expect(savingsRatePercent(1000, 0)).toBe(100);
    expect(savingsRatePercent(1000, -50)).toBe(100); // negative expense input never exceeds 100
  });
});

describe("T6R segmentProportions", () => {
  const sum = (s: ReturnType<typeof segmentProportions>) => s.reduce((a, x) => a + x.percentTenths, 0);
  it("sums to exactly 1000 for awkward values", () => {
    expect(sum(segmentProportions(1, 1, 1))).toBe(1000);
    expect(sum(segmentProportions(333333, 333333, 1))).toBe(1000);
    expect(sum(segmentProportions(100000, 99999, 1))).toBe(1000);
  });
  it("all zero -> all zero widths", () => {
    expect(sum(segmentProportions(0, 0, 0))).toBe(0);
  });
  it("negative balance gets zero width but keeps its value", () => {
    const s = segmentProportions(1000, 3000, -2000);
    expect(s[2].percentTenths).toBe(0);
    expect(s[2].cents).toBe(-2000);
    expect(sum(s)).toBe(1000);
  });
  it("expense-only month", () => {
    const s = segmentProportions(0, 5000, -5000);
    expect(s.map((x) => x.percentTenths)).toEqual([0, 1000, 0]);
  });
});

describe("T6R display-name", () => {
  it("falls back to email", () => {
    expect(displayName(null, "a@b.co")).toBe("a@b.co");
    expect(displayName({ full_name: "   " }, "a@b.co")).toBe("a@b.co");
    expect(displayName({ full_name: 42 }, "a@b.co")).toBe("a@b.co");
    expect(displayName({ full_name: " Ana P\u00e9rez " }, "a@b.co")).toBe("Ana P\u00e9rez");
  });
  it("does not interpret markup (plain string passthrough; React escapes on render)", () => {
    expect(displayName({ full_name: "<img src=x onerror=alert(1)>" }, "a@b.co")).toBe("<img src=x onerror=alert(1)>");
  });
  it("initials basics", () => {
    expect(initialsOf("Ana P\u00e9rez")).toBe("AP");
    expect(initialsOf("ana@example.com")).toBe("AN"); // doc comment says "first letter": single token yields 2 letters (cosmetic)
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("...")).toBe("?");
    expect(firstName("Ana P\u00e9rez")).toBe("Ana");
    expect(firstName("ana@example.com")).toBe("ana");
  });
  it("initials never contain lone surrogates (emoji first word)", () => {
    const out = initialsOf("\u{1F600} Ana");
    expect(/[\uD800-\uDFFF]/.test(out.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ""))).toBe(false);
  });
});

