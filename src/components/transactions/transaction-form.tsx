"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DEFAULT_TIMEZONE, isValidTimeZone, todayIso } from "@/lib/utils/dates";
import { transactionInputSchema, type TransactionInput } from "@/lib/validations/transaction";

export type CategoryOption = { id: string; name: string; type: "INCOME" | "EXPENSE" };

type Props = {
  categories: CategoryOption[];
  initial?: Partial<TransactionInput>;
  /** Server action wrapper. Field errors from the server are mapped onto the form. */
  onSubmit: (values: TransactionInput) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  onSuccess: () => void;
  onCancel: () => void;
};

/** The user's own calendar day for the form default (falls back to the app default zone). */
function browserTimeZone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

const FIELDS =["type", "categoryId", "amount", "description", "transactionDate"] as const;

export function TransactionForm({ categories, initial, onSubmit, onSuccess, onCancel }: Props) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionInputSchema),
    defaultValues: {
      type: initial?.type ?? "EXPENSE",
      categoryId: initial?.categoryId ?? "",
      amount: initial?.amount ?? "",
      description: initial?.description ?? "",
      transactionDate: initial?.transactionDate ?? todayIso(new Date(), browserTimeZone()),
    },
  });

  const type = useWatch({ control, name: "type" });
  const options = categories.filter((c) => c.type === type);

  const submit = handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        onSuccess();
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if ((FIELDS as readonly string[]).includes(field)) setError(field as (typeof FIELDS)[number], { message });
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="tx-type">Tipo</Label>
          <Select
            id="tx-type"
            {...register("type", { onChange: () => setValue("categoryId", "") })}
          >
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="tx-category">Categoría</Label>
          <Select id="tx-category" aria-invalid={errors.categoryId ? true : undefined}
            aria-describedby={errors.categoryId ? "tx-category-error" : undefined} {...register("categoryId")}>
            <option value="">Selecciona una categoría</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {errors.categoryId ? <p id="tx-category-error" className="text-sm text-danger">{errors.categoryId.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="tx-amount">Monto</Label>
          <Input
            id="tx-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? "tx-amount-error" : undefined}
            {...register("amount")}
          />
          {errors.amount ? <p id="tx-amount-error" className="text-sm text-danger">{errors.amount.message}</p> : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="tx-date">Fecha</Label>
          <Input
            id="tx-date"
            type="date"
            aria-invalid={errors.transactionDate ? true : undefined}
            aria-describedby={errors.transactionDate ? "tx-date-error" : undefined}
            {...register("transactionDate")}
          />
          {errors.transactionDate ? <p id="tx-date-error" className="text-sm text-danger">{errors.transactionDate.message}</p> : null}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="tx-description">Descripción (opcional)</Label>
        <Input
          id="tx-description"
          maxLength={255}
          aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "tx-description-error" : undefined}
          {...register("description")}
        />
        {errors.description ? <p id="tx-description-error" className="text-sm text-danger">{errors.description.message}</p> : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
