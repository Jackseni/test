/**
 * Money helpers. All arithmetic is done in integer cents; floats are only used
 * at the display edge (Intl) and when reading NUMERIC(14,2) values from PostgREST.
 * Max amount 999999999999.99 => 99_999_999_999_999 cents < Number.MAX_SAFE_INTEGER.
 */

export const MAX_CENTS = 99_999_999_999_999;

// Up to 12 integer digits, optional dot with 1-2 decimals. No sign, no exponent,
// no thousands separators, no comma (strict on purpose).
const AMOUNT_RE = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

/**
 * Spanish-locale input: a single comma with digits on both sides and no dot is a
 * decimal separator ("10,50" -> "10.50"). Anything else is returned untouched so
 * the strict validation still rejects "1,234.56", "1.234,56", "1,2,3", etc.
 * parseAmountToCents itself stays strict (dot only); normalize before parsing.
 */
export function normalizeAmountInput(input: string): string {
  const v = input.trim();
  return /^\d+,\d+$/.test(v) ? v.replace(",", ".") : v;
}

/** Parses a decimal string into integer cents. Returns null when invalid. */
export function parseAmountToCents(input: string): number | null {
  if (typeof input !== "string") return null;
  const match = AMOUNT_RE.exec(input.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + frac;
}

/** Converts a NUMERIC value as returned by PostgREST (number) into integer cents. */
export function numericToCents(value: number | string): number {
  const n = typeof value === "string" ? Number(value) : value;
  return Math.round(n * 100);
}

/** Integer cents -> "12.50" (decimal string, for inputs). */
export function centsToAmountString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Integer cents -> JS number with 2 decimals, for NUMERIC columns via PostgREST. */
export function centsToNumeric(cents: number): number {
  return Number(centsToAmountString(cents));
}

export const DEFAULT_CURRENCY = "HNL";
export const DEFAULT_LOCALE = "es-HN";

export function formatCents(
  cents: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
