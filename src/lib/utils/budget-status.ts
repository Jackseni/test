export type BudgetStatus = "ok" | "warning" | "exceeded";

export const WARNING_THRESHOLD_PERCENT = 80;

export type BudgetConsumption = {
  /** Consumption percentage floored to 2 decimals (79.99 never rounds up to 80). */
  percent: number;
  status: BudgetStatus;
  remainingCents: number;
};

/**
 * Budget consumption. Thresholds are evaluated with exact integer comparisons
 * (BigInt, because cents * 100 can exceed Number.MAX_SAFE_INTEGER):
 *   spent <  80% of budget  -> ok
 *   80% <= spent <= 100%    -> warning
 *   spent > 100% of budget  -> exceeded
 * A budget of 0 (or less) with any spending counts as exceeded.
 */
export function computeBudgetConsumption(spentCents: number, budgetCents: number): BudgetConsumption {
  const spent = BigInt(Math.max(0, Math.trunc(spentCents)));
  const budget = BigInt(Math.max(0, Math.trunc(budgetCents)));
  const remainingCents = budgetCents - spentCents;

  if (budget === BigInt(0)) {
    return spent > BigInt(0)
      ? { percent: 100, status: "exceeded", remainingCents }
      : { percent: 0, status: "ok", remainingCents };
  }

  const percent = Number((spent * BigInt(10000)) / budget) / 100;
  let status: BudgetStatus = "ok";
  if (spent > budget) status = "exceeded";
  else if (spent * BigInt(100) >= budget * BigInt(WARNING_THRESHOLD_PERCENT)) status = "warning";
  return { percent, status, remainingCents };
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  ok: "En rango",
  warning: "Cerca del límite",
  exceeded: "Excedido",
};
