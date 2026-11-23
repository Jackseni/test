import type { TransactionType } from "@/types/database";
import { monthRange } from "./dates";
import { numericToCents } from "./money";

/** Minimal transaction projection used for aggregation. */
export type AggRow = {
  type: TransactionType;
  amount: number | string;
  transaction_date: string; // YYYY-MM-DD
  category_id: string;
};

export type MonthTotals = {
  key: string; // "YYYY-MM"
  label: string; // "ene 2026"
  incomeCents: number;
  expenseCents: number;
};

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

export const monthKey = (year: number, month: number): string => `${String(year).padStart(4, "0")}-${pad2(month)}`;

/** "2026-03" -> "mar 2026" */
export function monthKeyLabel(key: string): string {
  const [year, month] = key.split("-");
  const name = MONTH_NAMES[Number(month) - 1];
  return name ? `${name} ${year}` : key;
}

/** `count` consecutive month keys ending at (year, month), oldest first. Handles year boundaries. */
export function lastMonthKeys(year: number, month: number, count: number): string[] {
  const keys: string[] = [];
  // Linear month index avoids any Date/timezone arithmetic.
  const end = year * 12 + (month - 1);
  for (let i = count - 1; i >= 0; i--) {
    const idx = end - i;
    keys.push(monthKey(Math.floor(idx / 12), (idx % 12) + 1));
  }
  return keys;
}

/** Inclusive list of month keys covering two ISO dates. */
export function monthKeysBetween(from: string, to: string): string[] {
  const fy = Number(from.slice(0, 4));
  const fm = Number(from.slice(5, 7));
  const ty = Number(to.slice(0, 4));
  const tm = Number(to.slice(5, 7));
  const count = (ty * 12 + tm) - (fy * 12 + fm) + 1;
  return count > 0 ? lastMonthKeys(ty, tm, count) : [];
}

/** Number of calendar months touched by the range (inclusive). */
export function monthSpan(from: string, to: string): number {
  return monthKeysBetween(from, to).length;
}

/** Income/expense per month key. Rows outside the given keys are ignored. */
export function aggregateByMonth(rows: readonly AggRow[], keys: readonly string[]): MonthTotals[] {
  const map = new Map<string, MonthTotals>(
    keys.map((key) => [key, { key, label: monthKeyLabel(key), incomeCents: 0, expenseCents: 0 }]),
  );
  for (const row of rows) {
    const bucket = map.get(row.transaction_date.slice(0, 7));
    if (!bucket) continue;
    const cents = numericToCents(row.amount);
    if (row.type === "INCOME") bucket.incomeCents += cents;
    else bucket.expenseCents += cents;
  }
  return keys.map((k) => map.get(k)!);
}

export type Totals = { incomeCents: number; expenseCents: number; balanceCents: number };

export function totalsOf(rows: readonly AggRow[]): Totals {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const row of rows) {
    const cents = numericToCents(row.amount);
    if (row.type === "INCOME") incomeCents += cents;
    else expenseCents += cents;
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

/** Totals for one calendar month of the given rows. */
export function totalsForMonth(rows: readonly AggRow[], year: number, month: number): Totals {
  const { from, to } = monthRange(year, month);
  return totalsOf(rows.filter((r) => r.transaction_date >= from && r.transaction_date <= to));
}

/** Expense cents per category, largest first (ties broken by id for stable output). */
export function sumExpensesByCategory(rows: readonly AggRow[]): { categoryId: string; cents: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.type !== "EXPENSE") continue;
    map.set(row.category_id, (map.get(row.category_id) ?? 0) + numericToCents(row.amount));
  }
  return [...map.entries()]
    .map(([categoryId, cents]) => ({ categoryId, cents }))
    .sort((a, b) => b.cents - a.cents || a.categoryId.localeCompare(b.categoryId));
}

/**
 * Percentages in tenths of a percent (1000 = 100.0%) using the largest remainder
 * method, so the displayed values always add up to exactly 100.0%.
 * Returns zeros when the total is 0.
 */
export function allocatePercentTenths(values: readonly number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const shares = values.map((v, i) => {
    const exact = (v * 1000) / total;
    return { i, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = 1000 - shares.reduce((a, s) => a + s.floor, 0);
  const order = [...shares].sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  const out = shares.map((s) => s.floor);
  for (const s of order) {
    if (left <= 0) break;
    out[s.i] += 1;
    left -= 1;
  }
  return out;
}

/** 853 -> "85,3 %" style label using a dot-free es format. */
export function formatPercentTenths(tenths: number): string {
  return `${(tenths / 10).toFixed(1).replace(".", ",")} %`;
}
