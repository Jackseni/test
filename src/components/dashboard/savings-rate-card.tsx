import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * "Tasa de ahorro" ring: (income - expenses) / income for the month, 0-100.
 * `percent` is null when there is no income ("—"). It is an honest savings rate, not a score.
 */
export function SavingsRateCard({ percent, monthLabel }: { percent: number | null; monthLabel: string }) {
  const offset = CIRCUMFERENCE * (1 - (percent ?? 0) / 100);
  const label = percent === null ? "Tasa de ahorro: sin datos" : `Tasa de ahorro: ${percent} %`;
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
      <CardHeader className="relative">
        <CardTitle>Tasa de ahorro</CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col items-center gap-3 pb-6">
        <div className="relative size-36">
          <svg viewBox="0 0 120 120" role="img" aria-label={label} className="size-full -rotate-90">
            <defs>
              <linearGradient id="ft-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            {percent !== null && percent > 0 ? (
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="url(#ft-ring-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
              />
            ) : null}
          </svg>
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-foreground">{percent === null ? "—" : `${percent} %`}</span>
          </div>
        </div>
        <p className="text-center text-xs leading-relaxed text-muted">
          {percent === null
            ? `Sin ingresos en ${monthLabel}: la tasa de ahorro no se puede calcular.`
            : `Porcentaje de tus ingresos de ${monthLabel} que no gastaste.`}
        </p>
      </CardContent>
    </Card>
  );
}
