"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createCategoryAction, updateCategoryAction } from "@/app/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_COLORS, categoryCreateSchema, type CategoryCreateInput } from "@/lib/validations/category";
import type { Category } from "@/services/categories";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this category (type is immutable). */
  category?: Category;
};

export function CategoryDialog({ open, onOpenChange, category }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>Las categorías organizan tus ingresos y gastos.</DialogDescription>
        </DialogHeader>
        <CategoryForm category={category} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryCreateInput>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: {
      name: category?.name ?? "",
      type: category?.type ?? "EXPENSE",
      color: category?.color ?? CATEGORY_COLORS[0],
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = category
        ? await updateCategoryAction(category.id, values)
        : await createCategoryAction(values);
      if (result.ok) {
        toast.success(category ? "Categoría actualizada" : "Categoría creada");
        onDone();
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "name" || field === "type" || field === "color") setError(field, { message });
      }
      setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          maxLength={50}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "cat-name-error" : undefined}
          {...register("name")}
        />
        {errors.name ? <p id="cat-name-error" className="text-sm text-danger">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="cat-type">Tipo</Label>
        <Select id="cat-type" disabled={Boolean(category)} {...register("type")}>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Gasto</option>
        </Select>
        {category ? <p className="text-xs text-muted">El tipo no se puede cambiar después de crear la categoría.</p> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Color</legend>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Color" aria-invalid={errors.color ? true : undefined} aria-describedby={errors.color ? "cat-color-error" : undefined} className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={field.value === c}
                  aria-label={`Color ${c}`}
                  onClick={() => field.onChange(c)}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "size-8 rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    field.value === c ? "ring-2 ring-white" : "hover:scale-110",
                  )}
                />
              ))}
            </div>
          )}
        />
        {errors.color ? <p id="cat-color-error" className="text-sm text-danger">{errors.color.message}</p> : null}
      </fieldset>

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
