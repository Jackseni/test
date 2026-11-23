"use client";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCategoryAction } from "@/app/(dashboard)/categories/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import type { Category } from "@/services/categories";
import { CategoryDialog } from "./category-dialog";

type Editing = { mode: "create" } | { mode: "edit"; category: Category };

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organiza tus ingresos y gastos."
        action={
          <Button onClick={() => setEditing({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Nueva categoría
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <CategoryColumn title="Ingresos" items={income} onEdit={(c) => setEditing({ mode: "edit", category: c })} onDelete={setDeleting} />
        <CategoryColumn title="Gastos" items={expense} onEdit={(c) => setEditing({ mode: "edit", category: c })} onDelete={setDeleting} />
      </div>

      {editing ? (
        <CategoryDialog
          key={editing.mode === "edit" ? editing.category.id : "new"}
          open
          onOpenChange={(open) => (open ? undefined : setEditing(null))}
          category={editing.mode === "edit" ? editing.category : undefined}
        />
      ) : null}

      {deleting ? (
        <ConfirmDelete
          open
          onOpenChange={(open) => (open ? undefined : setDeleting(null))}
          title="Eliminar categoría"
          description={`¿Seguro que quieres eliminar "${deleting.name}"? Esta acción no se puede deshacer.`}
          successMessage="Categoría eliminada"
          onConfirm={() => deleteCategoryAction(deleting.id)}
        />
      ) : null}
    </>
  );
}

function CategoryColumn({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="text-sm font-normal text-muted">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
            <Tags className="size-8 text-subtle" aria-hidden="true" />
            Aún no tienes categorías de {title.toLowerCase()}.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="size-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Editar ${c.name}`} onClick={() => onEdit(c)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Eliminar ${c.name}`} onClick={() => onDelete(c)}>
                    <Trash2 className="text-danger" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
