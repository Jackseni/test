"use client";

import { PiggyBank, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { deleteBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { monthKey, monthKeyLabel } from "@/lib/utils/aggregation";
import type { BudgetPeriod } from "@/lib/validations/budget";
import type { BudgetProgress as BudgetProgressItem } from "@/services/budgets";
import { BudgetDialog, type BudgetCategoryOption, type EditingBudget } from "./budget-dialog";
import { BudgetProgress } from "./budget-progress";
import { PeriodSelector } from "./period-selector";

type Editing = { mode: "create" } | { mode: "edit"; budget: EditingBudget };

export function BudgetsManager({
  items,
  expenseCategories,
  period,
}: {
  items: BudgetProgressItem[];
  expenseCategories: BudgetCategoryOption[];
  period: BudgetPeriod;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<BudgetProgressItem | null>(null);

  const budgeted = new Set(items.map((i) => i.categoryId));
  const available = expenseCategories.filter((c) => !budgeted.has(c.id));
  const noCategories = expenseCategories.length === 0;
  const periodLabel = monthKeyLabel(monthKey(period.year, period.month));

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Controla cuánto gastas por categoría cada mes."
        action={
          <Button onClick={() => setEditing({ mode: "create" })} disabled={available.length === 0}>
            <Plus aria-hidden="true" />
            Nuevo presupuesto
          </Button>
        }
      />

      <PeriodSelector key={`${period.year}-${period.month}`} period={period} />

      {noCategories ? (
        <p role="status" className="mb-4 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Primero crea una{" "}
          <Link href="/categories" className="font-semibold underline">
            categoría de gasto
          </Link>{" "}
          para poder definir presupuestos.
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center text-sm text-muted">
          <PiggyBank className="size-8 text-subtle" aria-hidden="true" />
          {noCategories
            ? "Aún no tienes categorías de gasto."
            : `No tienes presupuestos para ${periodLabel}. Crea el primero.`}
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-label={`Presupuestos de ${periodLabel}`}>
          {items.map((item) => (
            <li key={item.id}>
              <Card className="space-y-3 p-5">
                <BudgetProgress
                  name={item.categoryName}
                  color={item.categoryColor}
                  spentCents={item.spentCents}
                  budgetCents={item.budgetCents}
                  percent={item.percent}
                  status={item.status}
                />
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar presupuesto de ${item.categoryName}`}
                    onClick={() =>
                      setEditing({
                        mode: "edit",
                        budget: {
                          id: item.id,
                          categoryId: item.categoryId,
                          categoryName: item.categoryName,
                          budgetCents: item.budgetCents,
                        },
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar presupuesto de ${item.categoryName}`}
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 className="text-danger" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <BudgetDialog
          key={editing.mode === "edit" ? editing.budget.id : "new"}
          onOpenChange={(open) => (open ? undefined : setEditing(null))}
          period={period}
          categories={available}
          budget={editing.mode === "edit" ? editing.budget : undefined}
        />
      ) : null}

      {deleting ? (
        <ConfirmDelete
          open
          onOpenChange={(open) => (open ? undefined : setDeleting(null))}
          title="Eliminar presupuesto"
          description={`¿Seguro que quieres eliminar el presupuesto de "${deleting.categoryName}" de ${periodLabel}? Tus transacciones no se verán afectadas.`}
          successMessage="Presupuesto eliminado"
          onConfirm={() => deleteBudgetAction(deleting.id)}
        />
      ) : null}
    </>
  );
}
