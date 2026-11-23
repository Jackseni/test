"use client";

import { ArrowLeftRight, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/app/(dashboard)/transactions/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIsoDate } from "@/lib/utils/dates";
import { centsToAmountString, formatCents, numericToCents } from "@/lib/utils/money";
import type { PageInfo } from "@/lib/utils/pagination";
import type { TransactionFilters } from "@/lib/validations/transaction";
import type { Category } from "@/services/categories";
import type { Transaction } from "@/services/transactions";
import { TransactionFiltersBar } from "./transaction-filters";
import { TransactionForm } from "./transaction-form";

type Editing = { mode: "create" } | { mode: "edit"; transaction: Transaction };

function amountLabel(t: Transaction) {
  const text = formatCents(numericToCents(t.amount));
  return t.type === "INCOME" ? `+${text}` : `-${text}`;
}

function pageHref(filters: TransactionFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/transactions?${qs}` : "/transactions";
}

export function TransactionsManager({
  items,
  categories,
  filters,
  pageInfo,
}: {
  items: Transaction[];
  categories: Category[];
  filters: TransactionFilters;
  pageInfo: PageInfo;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const hasFilters = Boolean(filters.from || filters.to || filters.type || filters.categoryId);
  const canCreate = categories.length > 0;

  return (
    <>
      <PageHeader
        title="Transacciones"
        description="Registra y consulta tus ingresos y gastos."
        action={
          <Button onClick={() => setEditing({ mode: "create" })} disabled={!canCreate}>
            <Plus aria-hidden="true" />
            Nueva transacción
          </Button>
        }
      />

      {!canCreate ? (
        <p role="status" className="mb-4 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Primero crea al menos una{" "}
          <Link href="/categories" className="font-semibold underline">
            categoría
          </Link>{" "}
          para registrar transacciones.
        </p>
      ) : null}

      <TransactionFiltersBar key={JSON.stringify(filters)} filters={filters} categories={categories} />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center text-sm text-muted">
          <ArrowLeftRight className="size-8 text-subtle" aria-hidden="true" />
          {hasFilters ? "No hay transacciones que coincidan con los filtros." : "Aún no tienes transacciones registradas."}
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{formatIsoDate(t.transaction_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">{t.description || "—"}</TableCell>
                    <TableCell>
                      <CategoryChip category={byId.get(t.category_id)} />
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap text-right font-semibold ${t.type === "INCOME" ? "text-income" : "text-expense"}`}
                    >
                      {amountLabel(t)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <RowActions t={t} onEdit={() => setEditing({ mode: "edit", transaction: t })} onDelete={() => setDeleting(t)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((t) => (
              <li key={t.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CategoryChip category={byId.get(t.category_id)} />
                      <p className="mt-1 truncate text-sm text-muted">{t.description || "Sin descripción"}</p>
                      <p className="text-xs text-subtle">{formatIsoDate(t.transaction_date)}</p>
                    </div>
                    <p className={`shrink-0 font-semibold ${t.type === "INCOME" ? "text-income" : "text-expense"}`}>
                      {amountLabel(t)}
                    </p>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <RowActions t={t} onEdit={() => setEditing({ mode: "edit", transaction: t })} onDelete={() => setDeleting(t)} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <Pagination filters={filters} pageInfo={pageInfo} />
        </>
      )}

      {editing ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : setEditing(null))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing.mode === "edit" ? "Editar transacción" : "Nueva transacción"}</DialogTitle>
              <DialogDescription>Todos los montos se guardan con 2 decimales.</DialogDescription>
            </DialogHeader>
            <TransactionForm
              categories={categories}
              initial={
                editing.mode === "edit"
                  ? {
                      type: editing.transaction.type,
                      categoryId: editing.transaction.category_id,
                      amount: centsToAmountString(numericToCents(editing.transaction.amount)),
                      description: editing.transaction.description,
                      transactionDate: editing.transaction.transaction_date,
                    }
                  : undefined
              }
              onSubmit={(values) =>
                editing.mode === "edit"
                  ? updateTransactionAction(editing.transaction.id, values)
                  : createTransactionAction(values)
              }
              onSuccess={() => {
                toast.success(editing.mode === "edit" ? "Transacción actualizada" : "Transacción creada");
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {deleting ? (
        <ConfirmDelete
          open
          onOpenChange={(open) => (open ? undefined : setDeleting(null))}
          title="Eliminar transacción"
          description={`Se eliminará la transacción de ${amountLabel(deleting)} del ${formatIsoDate(deleting.transaction_date)}. Esta acción no se puede deshacer.`}
          successMessage="Transacción eliminada"
          onConfirm={() => deleteTransactionAction(deleting.id)}
        />
      ) : null}
    </>
  );
}

function CategoryChip({ category }: { category?: Category }) {
  if (!category) return <Badge>Sin categoría</Badge>;
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
      {category.name}
    </span>
  );
}

function RowActions({ t, onEdit, onDelete }: { t: Transaction; onEdit: () => void; onDelete: () => void }) {
  const label = t.description || formatIsoDate(t.transaction_date);
  return (
    <span className="inline-flex gap-1">
      <Button variant="ghost" size="icon" aria-label={`Editar transacción ${label}`} onClick={onEdit}>
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Eliminar transacción ${label}`} onClick={onDelete}>
        <Trash2 className="text-danger" />
      </Button>
    </span>
  );
}

function Pagination({ filters, pageInfo }: { filters: TransactionFilters; pageInfo: PageInfo }) {
  const { page, totalPages, total } = pageInfo;
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        Página {page} de {totalPages} · {total} {total === 1 ? "resultado" : "resultados"}
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link href={pageHref(filters, page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ChevronLeft aria-hidden="true" /> Anterior
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={pageHref(filters, page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Siguiente <ChevronRight aria-hidden="true" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
