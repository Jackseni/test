"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/utils/money";

export const INCOME_COLOR = "#2dd4bf"; // teal
export const EXPENSE_COLOR = "#f472b6"; // pink: income/expense are also told apart by legend text and the sr-only table

export type IncomeExpensePoint = { label: string; incomeCents: number; expenseCents: number };

type Props = {
  data: IncomeExpensePoint[];
  /** Accessible name of the chart, e.g. "Ingresos vs gastos de los últimos 6 meses". */
  title: string;
};

const toUnits = (cents: number) => cents / 100;
const compact = new Intl.NumberFormat("es-HN", { notation: "compact", maximumFractionDigits: 1 });
const AXIS_TICK = { fill: "#9aa6c0", fontSize: 12 };

/**
 * Responsive bar chart. The SVG is hidden from assistive tech and replaced by a
 * visually-hidden data table, so screen reader users get the exact numbers.
 */
export function IncomeExpenseChart({ data, title }: Props) {
  const chartData = data.map((d) => ({
    label: d.label,
    Ingresos: toUnits(d.incomeCents),
    Gastos: toUnits(d.expenseCents),
  }));

  return (
    <figure className="w-full">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
            <defs>
              <linearGradient id="ft-income-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INCOME_COLOR} stopOpacity={1} />
                <stop offset="100%" stopColor={INCOME_COLOR} stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="ft-expense-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EXPENSE_COLOR} stopOpacity={1} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v: number) => compact.format(v)} />
            <Tooltip
              formatter={(value) => formatCents(Math.round(Number(value) * 100))}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                background: "#0f182b",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8ecf6",
              }}
              labelStyle={{ color: "#9aa6c0" }}
              itemStyle={{ color: "#e8ecf6" }}
            />
            <Legend wrapperStyle={{ color: "#9aa6c0", fontSize: 12 }} iconType="circle" />
            <Bar dataKey="Ingresos" fill="url(#ft-income-grad)" radius={[8, 8, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Gastos" fill="url(#ft-expense-grad)" radius={[8, 8, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Gastos</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatCents(d.incomeCents)}</td>
              <td>{formatCents(d.expenseCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
