"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { monthKeyLabel, monthKey } from "@/lib/utils/aggregation";
import type { BudgetPeriod } from "@/lib/validations/budget";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** The selected period lives in the URL (?month=&year=), so it is shareable and server-rendered. */
export function PeriodSelector({ period }: { period: BudgetPeriod }) {
  const router = useRouter();
  const [month, setMonth] = useState(String(period.month));
  const [year, setYear] = useState(String(period.year));

  function apply(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ month, year });
    router.push(`/budgets?${params.toString()}`);
  }

  return (
    <form
      onSubmit={apply}
      aria-label="Periodo del presupuesto"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4"
    >
      <div className="space-y-1">
        <Label htmlFor="b-month">Mes</Label>
        <Select id="b-month" value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {monthKeyLabel(monthKey(2000, m)).split(" ")[0]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="b-year">Año</Label>
        <Input
          id="b-year"
          type="number"
          min={2000}
          max={2100}
          inputMode="numeric"
          className="w-28"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary">
        Ver periodo
      </Button>
    </form>
  );
}
