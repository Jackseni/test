"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBudgetAction, updateBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { monthKey, monthKeyLabel } from "@/lib/utils/aggregation";
import { centsToAmountString } from "@/lib/utils/money";
import { budgetCreateSchema, type BudgetCreateInput, type BudgetPeriod } from "@/lib/validations/budget";

export type BudgetCategoryOption = { id: string; name: string };

export type EditingBudget = { id: string; categoryId: string; categoryName: string; budgetCents: number };

type Props = {
  onOpenChange: (open: boolean) => void;
  period: BudgetPeriod;
  /** Expense categories that still have no budget in this period (create mode). */
  categories: BudgetCategoryOption[];
  budget?: EditingBudget;
};

export function BudgetDialog({ onOpenChange, period, categories, budget }: Props) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
          <DialogDescription>
            Periodo: {monthKeyLabel(monthKey(period.year, period.month))}. Solo se presupuestan categorías de gasto.
          </DialogDescription>
        </DialogHeader>
        <BudgetForm period={period} categories={categories} budget={budget} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({
  period,
  categories,
  budget,
  onDone,
}: {
  period: BudgetPeriod;
  categories: BudgetCategoryOption[];
  budget?: EditingBudget;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BudgetCreateInput>({
    resolver: zodResolver(budgetCreateSchema),
    defaultValues: {
      categoryId: budget?.categoryId ?? "",
      amount: budget ? centsToAmountString(budget.budgetCents) : "",
      month: period.month,
      year: period.year,
    },
  });

  const submit = handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = budget
        ? await updateBudgetAction(budget.id, { amount: values.amount })
        : await createBudgetAction(values);
      if (result.ok) {
        toast.success(budget ? "Presupuesto actualizado" : "Presupuesto creado");
        onDone();
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "categoryId" || field === "amount") setError(field, { message });
      }
      setFormError(result.error);
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="bud-category">Categoría de gasto</Label>
        {budget ? (
          // Not registered on purpose: RHF yields undefined for disabled registered inputs;
          // categoryId comes from defaultValues instead.
          <Select id="bud-category" disabled value={budget.categoryId} onChange={() => undefined}>
            <option value={budget.categoryId}>{budget.categoryName}</option>
          </Select>
        ) : (
          <Select id="bud-category" aria-invalid={errors.categoryId ? true : undefined}
            aria-describedby={errors.categoryId ? "bud-category-error" : undefined} {...register("categoryId")}>
            <option value="">Selecciona una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        {errors.categoryId ? <p id="bud-category-error" className="text-sm text-danger">{errors.categoryId.message}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="bud-amount">Monto del presupuesto</Label>
        <Input
          id="bud-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? "bud-amount-error" : undefined}
          {...register("amount")}
        />
        {errors.amount ? <p id="bud-amount-error" className="text-sm text-danger">{errors.amount.message}</p> : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
