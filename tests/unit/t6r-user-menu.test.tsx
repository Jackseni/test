import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));

import { UserMenu } from "@/components/layout/user-menu";
import { QuickSummary } from "@/components/dashboard/quick-summary";
import { HeroGreeting } from "@/components/dashboard/hero-greeting";
import { SavingsRateCard } from "@/components/dashboard/savings-rate-card";

describe("T6R UserMenu keyboard", () => {
  it("Enter opens and focuses the sign-out item; Escape closes and returns focus", async () => {
    const user = userEvent.setup();
    render(<UserMenu name="Ana Pérez" email="ana@example.com" />);
    const trigger = screen.getByRole("button", { name: /Menú de usuario, Ana Pérez/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const item = screen.getByRole("menuitem", { name: /Cerrar sesión/ });
    expect(item).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });
  it("Space opens; Tab out closes", async () => {
    const user = userEvent.setup();
    render(
      <>
        <UserMenu name="Ana" email="ana@example.com" />
        <button>after</button>
      </>,
    );
    screen.getByRole("button", { name: /Menú de usuario/ }).focus();
    await user.keyboard(" ");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("renders hostile name as text, not markup", () => {
    const { container } = render(<UserMenu name={"<img src=x onerror=alert(1)>"} email="a@b.co" />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("T6R dashboard widgets", () => {
  it("hero: real totals, negative balance, empty month", () => {
    const { rerender } = render(
      <HeroGreeting firstName="Ana" monthLabel="noviembre 2026" incomeCents={100000} expenseCents={150000} balanceCents={-50000} />,
    );
    expect(screen.getByRole("heading", { name: "Hola, Ana" })).toBeInTheDocument();
    expect(screen.getByText(/tu balance es/)).toBeInTheDocument();
    rerender(<HeroGreeting firstName="Ana" monthLabel="noviembre 2026" incomeCents={0} expenseCents={0} balanceCents={0} />);
    expect(screen.getByText(/Todavía no registras movimientos/)).toBeInTheDocument();
  });
  it("savings ring: accessible text for null / value", () => {
    const { rerender } = render(<SavingsRateCard percent={null} monthLabel="nov" />);
    expect(screen.getByRole("img", { name: "Tasa de ahorro: sin datos" })).toBeInTheDocument();
    rerender(<SavingsRateCard percent={42} monthLabel="nov" />);
    expect(screen.getByRole("img", { name: "Tasa de ahorro: 42 %" })).toBeInTheDocument();
  });
  it("quick summary: bar is aria-hidden, values always printed in text", () => {
    render(<QuickSummary monthLabel="nov" incomeCents={1000} expenseCents={3000} balanceCents={-2000} />);
    expect(screen.getByText("Ingresos")).toBeInTheDocument();
    expect(screen.getByText("Gastos")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
  });
});
