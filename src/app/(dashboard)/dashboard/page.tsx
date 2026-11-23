import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BudgetProgress } from "@/components/budgets/budget-progress";
import { CategoryDistribution } from "@/components/charts/category-distribution";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { HeroGreeting } from "@/components/dashboard/hero-greeting";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickSummary } from "@/components/dashboard/quick-summary";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SavingsRateCard } from "@/components/dashboard/savings-rate-card";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { monthKey, monthKeyLabel } from "@/lib/utils/aggregation";
import { getAppTimezone } from "@/lib/env";
import { monthRange, todayIso } from "@/lib/utils/dates";
import { displayName, firstName } from "@/lib/utils/display-name";
import { savingsRatePercent } from "@/lib/utils/savings-rate";
import { listBudgetProgress } from "@/services/budgets";
import { getDashboardSummary, getRecentTransactions } from "@/services/dashboard";
import { getReport } from "@/services/reports";

export const metadata: Metadata = { title: "Dashboard | FinTrack" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Resumen de tus finanzas." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" role="status" aria-label="Cargando dashboard">
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-80" />
        <Skeleton className="h-72" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

async function DashboardContent() {
  // Cache Components: the current time must never be captured in the static shell.
  await io();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayIso(new Date(), getAppTimezone()); // after the request-bound auth call (dynamic)
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const range = monthRange(year, month);

  const [summary, recent, budgets, monthReport] = await Promise.all([
    getDashboardSummary(supabase, user.id, today),
    getRecentTransactions(supabase, user.id, 8),
    listBudgetProgress(supabase, user.id, year, month),
    getReport(supabase, user.id, range.from, range.to), // this month's expenses by category (donut)
  ]);
  if (!summary.ok || !recent.ok || !budgets.ok || !monthReport.ok) throw new Error("dashboard_load_failed"); // generic UI via error.tsx

  const { allTime, currentMonth, series } = summary.data;
  const monthLabel = monthKeyLabel(monthKey(year, month));
  const hasData = series.some((s) => s.incomeCents > 0 || s.expenseCents > 0);
  const expenses = monthReport.data.expensesByCategory;
  const name = firstName(displayName(user.user_metadata, user.email ?? ""));
  const savingsRate = savingsRatePercent(currentMonth.incomeCents, currentMonth.expenseCents);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
        <HeroGreeting
          firstName={name}
          monthLabel={monthLabel}
          incomeCents={currentMonth.incomeCents}
          expenseCents={currentMonth.expenseCents}
          balanceCents={currentMonth.balanceCents}
        />

        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Ingresos totales" cents={allTime.incomeCents} icon={ArrowUpCircle} tone="income" />
          <KpiCard label="Gastos totales" cents={allTime.expenseCents} icon={ArrowDownCircle} tone="expense" />
          <KpiCard label="Balance" cents={allTime.balanceCents} icon={Wallet} tone="balance" hint="Ingresos menos gastos, histórico" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs gastos (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <IncomeExpenseChart data={series} title="Ingresos vs gastos de los últimos 6 meses" />
            ) : (
              <p className="py-10 text-center text-sm text-muted">
                Todavía no hay movimientos en los últimos 6 meses para graficar.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de gastos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No hay gastos registrados en {monthLabel}.</p>
            ) : (
              <CategoryDistribution items={expenses} title={`Gastos por categoría de ${monthLabel}`} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-6">
        <SavingsRateCard percent={savingsRate} monthLabel={monthLabel} />
        <QuickSummary
          monthLabel={monthLabel}
          incomeCents={currentMonth.incomeCents}
          expenseCents={currentMonth.expenseCents}
          balanceCents={currentMonth.balanceCents}
        />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Presupuestos de {monthLabel}</CardTitle>
            <Link
              href="/budgets"
              className="rounded-full px-2 text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Administrar
            </Link>
          </CardHeader>
          <CardContent>
            {budgets.data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
                <PiggyBank className="size-8 text-subtle" aria-hidden="true" />
                No tienes presupuestos para este mes.
              </div>
            ) : (
              <ul className="space-y-4">
                {budgets.data.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <BudgetProgress
                      name={b.categoryName}
                      color={b.categoryColor}
                      spentCents={b.spentCents}
                      budgetCents={b.budgetCents}
                      percent={b.percent}
                      status={b.status}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 xl:col-span-2">
        <RecentTransactions items={recent.data} />
      </div>
    </div>
  );
}
