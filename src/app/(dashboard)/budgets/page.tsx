import type { Metadata } from "next";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BudgetsManager } from "@/components/budgets/budgets-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getAppTimezone } from "@/lib/env";
import { todayIso } from "@/lib/utils/dates";
import { parseBudgetPeriod } from "@/lib/validations/budget";
import { listBudgetProgress } from "@/services/budgets";
import { listCategories } from "@/services/categories";

export const metadata: Metadata = { title: "Presupuestos | FinTrack" };

type SearchParamsProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function BudgetsPage({ searchParams }: SearchParamsProps) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BudgetsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BudgetsContent({ searchParams }: { searchParams: SearchParamsProps["searchParams"] }) {
  // Cache Components: the current time must never be captured in the static shell.
  await io();
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayIso(new Date(), getAppTimezone()); // read after the request-bound auth call (dynamic)
  const period = parseBudgetPeriod(params, { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });

  const [progress, categories] = await Promise.all([
    listBudgetProgress(supabase, user.id, period.year, period.month),
    listCategories(supabase, user.id, "EXPENSE"),
  ]);
  if (!progress.ok || !categories.ok) throw new Error("budgets_load_failed"); // generic UI via error.tsx

  return (
    <BudgetsManager
      items={progress.data}
      expenseCategories={categories.data.map((c) => ({ id: c.id, name: c.name }))}
      period={period}
    />
  );
}
