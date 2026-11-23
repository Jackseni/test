import { allocatePercentTenths } from "./aggregation";

export type SegmentKey = "income" | "expense" | "balance";

export type Segment = { key: SegmentKey; cents: number; percentTenths: number };

/**
 * Proportions for the "Resumen rápido" segmented bar. Widths are proportional to
 * income, expenses and the positive part of the balance (a negative balance has no
 * width; its value is still shown in the stats). Tenths of a percent are allocated with
 * the largest remainder method, so they always add up to exactly 1000 (100.0%) unless
 * every value is zero, in which case all widths are 0.
 */
export function segmentProportions(incomeCents: number, expenseCents: number, balanceCents: number): Segment[] {
  const values = [Math.max(0, incomeCents), Math.max(0, expenseCents), Math.max(0, balanceCents)];
  const tenths = allocatePercentTenths(values);
  const keys: SegmentKey[] = ["income", "expense", "balance"];
  return keys.map((key, i) => ({ key, cents: [incomeCents, expenseCents, balanceCents][i], percentTenths: tenths[i] }));
}
