import { ArrowDownCircle, ArrowUpCircle, BarChart3, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CategoryDistribution } from "@/components/charts/category-distribution";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportFilter } from "@/components/reports/report-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getAppTimezone } from "@/lib/env";
import { todayIso, formatIsoDate } from "@/lib/utils/dates";
import { MAX_REPORT_MONTHS, parseReportRange } from "@/lib/validations/report";
import { getReport } from "@/services/reports";

export const metadata: Metadata = { title: "Reportes | FinTrack" };

type SearchParamsProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ReportsPage({ searchParams }: SearchParamsProps) {
  return (
    <>
      <PageHeader title="Reportes" description="Analiza tus ingresos y gastos por periodo." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ReportsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReportsContent({ searchParams }: { searchParams: SearchParamsProps["searchParams"] }) {
  // Cache Components: the current time must never be captured in the static shell.
  await io();
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const range = parseReportRange(params, todayIso(new Date(), getAppTimezone())); // date read after the dynamic auth call
  const report = await getReport(supabase, user.id, range.from, range.to);
  if (!report.ok) throw new Error("report_load_failed"); // generic UI via error.tsx

  const { totals, months, expensesByCategory, transactionCount } = report.data;
  const rangeLabel = `${formatIsoDate(range.from)} al ${formatIsoDate(range.to)}`;

  return (
    <>
      <ReportFilter key={`${range.from}-${range.to}`} from={range.from} to={range.to} />

      {range.clamped ? (
        <p role="status" className="mb-4 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          El rango máximo es de {MAX_REPORT_MONTHS} meses. Se ajustó la fecha inicial.
        </p>
      ) : null}

      {transactionCount === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center text-sm text-muted">
          <BarChart3 className="size-8 text-subtle" aria-hidden="true" />
          No hay transacciones entre el {rangeLabel}. Prueba con otro rango de fechas.
        </Card>
      ) : (
        <div className="space-y-6">
          <section aria-label={`Totales del ${rangeLabel}`} className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Ingresos" cents={totals.incomeCents} icon={ArrowUpCircle} tone="income" />
            <KpiCard label="Gastos" cents={totals.expenseCents} icon={ArrowDownCircle} tone="expense" />
            <KpiCard label="Balance" cents={totals.balanceCents} icon={Wallet} tone="balance" hint={`${transactionCount} transacciones`} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs gastos por mes</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeExpenseChart data={months} title={`Ingresos vs gastos por mes, del ${rangeLabel}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de gastos por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No hay gastos en este rango.</p>
              ) : (
                <CategoryDistribution items={expensesByCategory} title={`Gastos por categoría, del ${rangeLabel}`} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
