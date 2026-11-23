import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransactionsManager } from "@/components/transactions/transactions-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE, parseTransactionFilters } from "@/lib/validations/transaction";
import { listCategories } from "@/services/categories";
import { listTransactions } from "@/services/transactions";

export const metadata: Metadata = { title: "Transacciones | FinTrack" };

type SearchParamsProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function TransactionsPage({ searchParams }: SearchParamsProps) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TransactionsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TransactionsContent({ searchParams }: { searchParams: SearchParamsProps["searchParams"] }) {
  const filters = parseTransactionFilters(await searchParams);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [categories, page] = await Promise.all([
    listCategories(supabase, user.id),
    listTransactions(supabase, user.id, filters),
  ]);
  if (!categories.ok || !page.ok) throw new Error("transactions_load_failed"); // generic UI via error.tsx

  // Requested page beyond the last one: go to the last page instead of an empty list.
  if (page.data.items.length === 0 && filters.page > page.data.pageInfo.totalPages) {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.type) params.set("type", filters.type);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    // Keep a non-default page size too.
    if (filters.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(filters.pageSize));
    if (page.data.pageInfo.totalPages > 1) params.set("page", String(page.data.pageInfo.totalPages));
    const qs = params.toString();
    redirect(qs ? `/transactions?${qs}` : "/transactions");
  }

  return (
    <TransactionsManager
      items={page.data.items}
      categories={categories.data}
      filters={filters}
      pageInfo={page.data.pageInfo}
    />
  );
}
