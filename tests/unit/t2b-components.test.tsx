import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetProgress } from "@/components/budgets/budget-progress";
import { CategoryDistribution } from "@/components/charts/category-distribution";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";

describe("BudgetProgress", () => {
  it("exposes progressbar aria values and a textual status", () => {
    render(<BudgetProgress name="Comida" spentCents={8500} budgetCents={10000} percent={85} status="warning" />);
    const bar = screen.getByRole("progressbar", { name: /Comida/ });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "85");
    expect(screen.getByText("Cerca del límite")).toBeInTheDocument();
  });

  it("clamps the bar at 100 but still reports the exceeded state in text", () => {
    render(<BudgetProgress name="Ocio" spentCents={25000} budgetCents={10000} percent={250} status="exceeded" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Excedido")).toBeInTheDocument();
    expect(screen.getByText("250%")).toBeInTheDocument();
  });
});

describe("chart wrappers", () => {
  it("income/expense chart provides an accessible data table with formatted amounts", () => {
    render(
      <IncomeExpenseChart
        title="Ingresos vs gastos"
        data={[{ label: "ene 2026", incomeCents: 150000, expenseCents: 25050 }]}
      />,
    );
    expect(screen.getByRole("table", { name: "Ingresos vs gastos" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "ene 2026" })).toBeInTheDocument();
    expect(screen.getByText(/250[.,]50/)).toBeInTheDocument();
  });

  it("category distribution lists percentages in a table", () => {
    render(
      <CategoryDistribution
        title="Gastos por categoría"
        items={[
          { categoryId: "a", name: "Comida", color: "#10b981", cents: 7500, percentTenths: 750 },
          { categoryId: "b", name: "Ocio", color: "#6366f1", cents: 2500, percentTenths: 250 },
        ]}
      />,
    );
    expect(screen.getByText("75,0 %")).toBeInTheDocument();
    expect(screen.getByText("25,0 %")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /Comida/ })).toBeInTheDocument();
  });
});
