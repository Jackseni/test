import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TransactionForm } from "@/components/transactions/transaction-form";

const CATS = [
  { id: "123e4567-e89b-42d3-a456-426614174000", name: "Comida", type: "EXPENSE" as const },
  { id: "223e4567-e89b-42d3-a456-426614174000", name: "Salario", type: "INCOME" as const },
];

function setup(onSubmit = vi.fn().mockResolvedValue({ ok: true })) {
  const onSuccess = vi.fn();
  render(<TransactionForm categories={CATS} onSubmit={onSubmit} onSuccess={onSuccess} onCancel={vi.fn()} />);
  return { onSubmit, onSuccess, user: userEvent.setup() };
}

describe("TransactionForm", () => {
  it("shows Spanish validation errors and does not submit", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Selecciona una categoría", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Ingresa un monto")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects 3 decimals and zero", async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText("Categoría"), CATS[0].id);
    await user.type(screen.getByLabelText("Monto"), "1.234");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Máximo 2 decimales")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "0");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("El monto debe ser mayor que 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("only lists categories matching the selected type", async () => {
    const { user } = setup();
    expect(screen.getByRole("option", { name: "Comida" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Salario" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Tipo"), "INCOME");
    expect(screen.getByRole("option", { name: "Salario" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Comida" })).not.toBeInTheDocument();
  });

  it("submits valid data, and disables the button while pending", async () => {
    let resolve!: (v: { ok: boolean }) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const { onSuccess, user } = setup(onSubmit);
    await user.selectOptions(screen.getByLabelText("Categoría"), CATS[0].id);
    await user.type(screen.getByLabelText("Monto"), "10.50");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: "EXPENSE", categoryId: CATS[0].id, amount: "10.50" });

    resolve({ ok: true });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows server errors generically", async () => {
    const { user } = setup(vi.fn().mockResolvedValue({ ok: false, error: "La categoría seleccionada no existe." }));
    await user.selectOptions(screen.getByLabelText("Categoría"), CATS[0].id);
    await user.type(screen.getByLabelText("Monto"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La categoría seleccionada no existe.");
  });
});
