"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Range lives in the URL (?from=&to=); the server validates and clamps it. */
export function ReportFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [fromValue, setFrom] = useState(from);
  const [toValue, setTo] = useState(to);

  function apply(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (fromValue) params.set("from", fromValue);
    if (toValue) params.set("to", toValue);
    const qs = params.toString();
    router.push(qs ? `/reports?${qs}` : "/reports");
  }

  return (
    <form
      onSubmit={apply}
      aria-label="Rango del reporte"
      className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4"
    >
      <div className="space-y-1">
        <Label htmlFor="r-from">Desde</Label>
        <Input id="r-from" type="date" value={fromValue} min="2000-01-01" max="2100-12-31" onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="r-to">Hasta</Label>
        <Input id="r-to" type="date" value={toValue} min="2000-01-01" max="2100-12-31" onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary">
        Generar reporte
      </Button>
      <Button variant="outline" onClick={() => router.push("/reports")}>
        Mes actual
      </Button>
    </form>
  );
}
