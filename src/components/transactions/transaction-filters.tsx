"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TransactionFilters } from "@/lib/validations/transaction";
import type { CategoryOption } from "./transaction-form";

/** Filters live in the URL (shareable, server-rendered). Applying resets to page 1. */
export function TransactionFiltersBar({
  filters,
  categories,
}: {
  filters: TransactionFilters;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [type, setType] = useState(filters.type ?? "");
  const [categoryId, setCategoryId] = useState(filters.categoryId ?? "");

  const visibleCategories = type ? categories.filter((c) => c.type === type) : categories;

  function apply(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    const qs = params.toString();
    router.push(qs ? `/transactions?${qs}` : "/transactions");
  }

  function clear() {
    setFrom("");
    setTo("");
    setType("");
    setCategoryId("");
    router.push("/transactions");
  }

  return (
    <form
      onSubmit={apply}
      aria-label="Filtros de transacciones"
      className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="space-y-1">
        <Label htmlFor="f-from">Desde</Label>
        <Input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-to">Hasta</Label>
        <Input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-type">Tipo</Label>
        <Select
          id="f-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCategoryId("");
          }}
        >
          <option value="">Todos</option>
          <option value="INCOME">Ingresos</option>
          <option value="EXPENSE">Gastos</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-category">Categoría</Label>
        <Select id="f-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" variant="secondary" className="flex-1">
          Filtrar
        </Button>
        <Button variant="outline" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
