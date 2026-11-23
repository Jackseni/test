import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Real WCAG 2.x contrast computed from the tokens in src/app/globals.css (no hard-coded copies).
const css = readFileSync(resolve(__dirname, "../../src/app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const token = (name: string): string => {
  const m = root.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`missing token ${name}`);
  return m[1].trim();
};

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const T = (n: string) => hex(token(n));

const surfaces = ["background", "surface", "surface-2"];
const textTokens = ["foreground", "muted", "subtle", "accent", "income", "expense", "warn", "danger"];

describe("T6R WCAG contrast of design tokens", () => {
  const rows: string[] = [];
  for (const fg of textTokens) {
    for (const bg of surfaces) {
      it(`${fg} on ${bg} >= 4.5:1`, () => {
        const r = ratio(T(fg), T(bg));
        rows.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
        expect(r).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("white on primary-strong >= 4.5:1 (auth submit button, avatar gradient start)", () => {
    expect(ratio([255, 255, 255], T("primary-strong"))).toBeGreaterThanOrEqual(4.5);
  });
  it.fails("KNOWN LOW: white on primary (hover state of submit button) >= 4.5:1", () => {
    expect(ratio([255, 255, 255], T("primary"))).toBeGreaterThanOrEqual(4.5);
  });
  it.fails("KNOWN LOW: white on info (avatar gradient end) >= 4.5:1", () => {
    expect(ratio([255, 255, 255], T("info"))).toBeGreaterThanOrEqual(4.5);
  });
  for (const bg of surfaces) {
    it(`focus ring (accent) vs ${bg} >= 3:1`, () => {
      expect(ratio(T("accent"), T(bg))).toBeGreaterThanOrEqual(3);
    });
  }
  it("chart colors vs surface >= 3:1", () => {
    for (const c of ["#2dd4bf", "#f472b6", "#8b5cf6", "#6366f1"]) {
      expect(ratio(hex(c), T("surface")), c).toBeGreaterThanOrEqual(3);
    }
  });
  it("primary bar/dot (#7c5cff) vs surface >= 3:1 (non-text graphical object)", () => {
    expect(ratio(T("primary"), T("surface"))).toBeGreaterThanOrEqual(3);
  });
  it("comment in globals.css contrast claims are not wildly off (measured, informational)", () => {
    const measured = {
      muted: ratio(T("muted"), T("surface")),
      subtle: ratio(T("subtle"), T("surface")),
      accent: ratio(T("accent"), T("surface")),
      income: ratio(T("income"), T("surface")),
      expense: ratio(T("expense"), T("surface")),
      primaryStrongWhite: ratio([255, 255, 255], T("primary-strong")),
    };
    console.info("T6R measured contrast vs surface", JSON.stringify(measured));
    expect(measured.muted).toBeGreaterThan(6);
  });
});

