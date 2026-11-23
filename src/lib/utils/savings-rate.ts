/**
 * Savings rate = (income - expenses) / income, as an integer percentage clamped to 0-100.
 * Returns null when there is no income (the rate is undefined, the UI shows "—").
 * All inputs are integer cents; negative savings (expenses > income) clamp to 0.
 */
export function savingsRatePercent(incomeCents: number, expenseCents: number): number | null {
  if (!Number.isFinite(incomeCents) || !Number.isFinite(expenseCents) || incomeCents <= 0) return null;
  const raw = ((incomeCents - Math.max(0, expenseCents)) * 100) / incomeCents;
  return Math.min(100, Math.max(0, Math.round(raw)));
}
