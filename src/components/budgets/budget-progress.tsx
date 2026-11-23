import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { BUDGET_STATUS_LABEL, type BudgetStatus } from "@/lib/utils/budget-status";
import { formatCents } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

const BAR_COLOR: Record<BudgetStatus, string> = {
  ok: "bg-gradient-to-r from-income to-info",
  warning: "bg-warn",
  exceeded: "bg-expense",
};

const BADGE_COLOR: Record<BudgetStatus, string> = {
  ok: "bg-income/15 text-income",
  warning: "bg-warn/15 text-warn",
  exceeded: "bg-expense/15 text-expense",
};

const ICON = { ok: CheckCircle2, warning: AlertTriangle, exceeded: XCircle } as const;

export type BudgetProgressProps = {
  name: string;
  color?: string;
  spentCents: number;
  budgetCents: number;
  percent: number;
  status: BudgetStatus;
};

/**
 * Accessible budget meter: status is conveyed by text + icon (not color alone)
 * and the bar exposes role=progressbar with aria values (clamped to 0-100).
 */
export function BudgetProgress({ name, color, spentCents, budgetCents, percent, status }: BudgetProgressProps) {
  const shown = Math.floor(percent);
  const clamped = Math.min(100, Math.max(0, shown));
  const Icon = ICON[status];
  const text = `${formatCents(spentCents)} de ${formatCents(budgetCents)}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          {color ? (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          ) : null}
          <span className="truncate">{name}</span>
        </span>
        <span
          className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", BADGE_COLOR[status])}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {BUDGET_STATUS_LABEL[status]}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Consumo del presupuesto de ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={`${shown}% consumido. ${text}`}
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div className={cn("h-full rounded-full transition-[width]", BAR_COLOR[status])} style={{ width: `${clamped}%` }} />
      </div>
      <p className="flex justify-between text-xs text-muted">
        <span>{text}</span>
        <span className="font-semibold text-foreground">{shown}%</span>
      </p>
    </div>
  );
}
