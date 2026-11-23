import { Sparkles } from "lucide-react";
import { formatCents } from "@/lib/utils/money";

/** Greeting card. The summary sentence is built only from the user's real month totals. */
export function HeroGreeting({
  firstName,
  monthLabel,
  incomeCents,
  expenseCents,
  balanceCents,
}: {
  firstName: string;
  monthLabel: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}) {
  const empty = incomeCents === 0 && expenseCents === 0;
  return (
    <section
      aria-label="Saludo"
      className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-10 size-72 rounded-full bg-primary/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-40 size-56 rounded-full bg-info/20 blur-3xl" />
      <div className="relative min-w-0 max-w-xl">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-accent">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {monthLabel}
        </p>
        <h2 className="mt-4 min-w-0 break-words text-3xl font-bold tracking-tight text-foreground">
          {firstName.trim() ? `Hola, ${firstName}` : "Hola"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {empty
            ? "Todavía no registras movimientos este mes. Agrega tu primera transacción para ver tu resumen."
            : `En ${monthLabel} tu balance es ${formatCents(balanceCents)}: ${formatCents(incomeCents)} de ingresos y ${formatCents(expenseCents)} de gastos.`}
        </p>
      </div>
    </section>
  );
}
