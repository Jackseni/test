import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCents } from "@/lib/utils/money";

type Tone = "income" | "expense" | "balance";

const TONE_TEXT: Record<Tone, string> = {
  income: "text-income",
  expense: "text-expense",
  balance: "text-foreground",
};

const TONE_CIRCLE: Record<Tone, string> = {
  income: "bg-income/15 text-income",
  expense: "bg-expense/15 text-expense",
  balance: "bg-primary/20 text-accent",
};

/** Balance is shown with an explicit sign and wording, not only a color. */
export function KpiCard({
  label,
  cents,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  cents: number;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
}) {
  const color = tone === "balance" && cents < 0 ? "text-expense" : TONE_TEXT[tone];
  return (
    <Card className="relative overflow-hidden p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 size-28 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONE_CIRCLE[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className={cn("relative mt-3 text-2xl font-bold tabular-nums", color)}>{formatCents(cents)}</p>
      {hint ? <p className="relative mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
