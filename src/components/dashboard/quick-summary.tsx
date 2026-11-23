import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCents } from "@/lib/utils/money";
import { segmentProportions, type SegmentKey } from "@/lib/utils/segments";

const META: Record<SegmentKey, { label: string; bar: string; dot: string; text: string }> = {
  income: { label: "Ingresos", bar: "bg-income", dot: "bg-income", text: "text-income" },
  expense: { label: "Gastos", bar: "bg-expense", dot: "bg-expense", text: "text-expense" },
  balance: { label: "Balance", bar: "bg-primary", dot: "bg-primary", text: "text-accent" },
};

/** "Resumen rápido": month badge, segmented pill bar proportional to income/expenses/balance and 3 stats. */
export function QuickSummary({
  monthLabel,
  incomeCents,
  expenseCents,
  balanceCents,
}: {
  monthLabel: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}) {
  const segments = segmentProportions(incomeCents, expenseCents, balanceCents);
  const hasBar = segments.some((s) => s.percentTenths > 0);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 p-5 pb-3">
        {/* Not a heading on purpose: keeps the page outline to the real section titles. */}
        <p className="text-base font-semibold text-foreground">Resumen rápido</p>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-accent">
          {monthLabel}
        </span>
      </div>
      <CardContent className="space-y-4">
        <div aria-hidden="true" className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-white/10">
          {hasBar
            ? segments
                .filter((s) => s.percentTenths > 0)
                .map((s) => (
                  <div key={s.key} className={cn("h-full rounded-full", META[s.key].bar)} style={{ width: `${s.percentTenths / 10}%` }} />
                ))
            : null}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {segments.map((s) => (
            <div key={s.key} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <span className={cn("size-2 shrink-0 rounded-full", META[s.key].dot)} aria-hidden="true" />
                {META[s.key].label}
              </dt>
              <dd className={cn("mt-1 truncate text-sm font-bold tabular-nums", META[s.key].text)}>{formatCents(s.cents)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
