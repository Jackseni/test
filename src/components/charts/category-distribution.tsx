"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPercentTenths } from "@/lib/utils/aggregation";
import { formatCents } from "@/lib/utils/money";

export type CategoryDistributionItem = {
  categoryId: string;
  name: string;
  color: string;
  cents: number;
  percentTenths: number;
};

/**
 * Donut chart (total in the center) + table legend. Percentages are always printed,
 * so the information never relies on color alone. The SVG is hidden from assistive tech;
 * the table carries the data.
 */
export function CategoryDistribution({ items, title }: { items: CategoryDistributionItem[]; title: string }) {
  const data = items.map((i) => ({ name: i.name, value: i.cents / 100, color: i.color, id: i.categoryId }));
  const totalCents = items.reduce((sum, i) => sum + i.cents, 0);

  return (
    <figure className="grid items-center gap-6 lg:grid-cols-2">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="relative h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCents(Math.round(Number(value) * 100))}
              contentStyle={{
                background: "#0f182b",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8ecf6",
              }}
              itemStyle={{ color: "#e8ecf6" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted">Total gastos</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{formatCents(totalCents)}</span>
        </div>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="py-2 font-medium">
              Categoría
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Monto
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.categoryId} className="border-b border-line last:border-0">
              <th scope="row" className="py-2.5 text-left font-medium text-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: i.color }} aria-hidden="true" />
                  {i.name}
                </span>
              </th>
              <td className="py-2.5 text-right tabular-nums text-muted">{formatCents(i.cents)}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums text-foreground">
                {formatPercentTenths(i.percentTenths)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
