import { ArrowDownRight, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIsoDate } from "@/lib/utils/dates";
import { formatCents, numericToCents } from "@/lib/utils/money";
import type { RecentTransaction } from "@/services/dashboard";

/** Compact pill-row table: Fecha, Descripción, Categoría, Monto (sign + icon + color). */
export function RecentTransactions({ items }: { items: RecentTransaction[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Transacciones recientes</CardTitle>
        <Link
          href="/transactions"
          className="rounded-full px-2 text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
            <ArrowLeftRight className="size-8 text-subtle" aria-hidden="true" />
            Aún no tienes transacciones. Registra la primera en la sección Transacciones.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-separate border-spacing-y-1.5 text-sm">
              <caption className="sr-only">Últimas transacciones registradas</caption>
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="px-4 pb-1 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 pb-1 font-medium">
                    Descripción
                  </th>
                  <th scope="col" className="px-4 pb-1 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 pb-1 text-right font-medium">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => {
                  const income = t.type === "INCOME";
                  const Icon = income ? ArrowUpRight : ArrowDownRight;
                  return (
                    <tr key={t.id} className="group">
                      <td className="whitespace-nowrap rounded-l-full bg-white/[0.04] px-4 py-2.5 text-muted group-hover:bg-white/[0.07]">
                        {formatIsoDate(t.date)}
                      </td>
                      <td className="max-w-[12rem] truncate bg-white/[0.04] px-4 py-2.5 text-foreground group-hover:bg-white/[0.07]">
                        {t.description || "Sin descripción"}
                      </td>
                      <td className="bg-white/[0.04] px-4 py-2.5 text-foreground group-hover:bg-white/[0.07]">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.categoryColor }} aria-hidden="true" />
                          <span className="truncate">{t.categoryName}</span>
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap rounded-r-full bg-white/[0.04] px-4 py-2.5 text-right font-semibold tabular-nums group-hover:bg-white/[0.07] ${income ? "text-income" : "text-expense"}`}
                      >
                        <span className="sr-only">{income ? "Ingreso " : "Gasto "}</span>
                        <Icon className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                        {income ? "+" : "−"}
                        {formatCents(numericToCents(t.amountNumeric))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
