import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { parseTransactionFilters } from "@/lib/validations/transaction";

const updateCategoryAction = vi.fn().mockResolvedValue({ ok: true });
const createCategoryAction = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/app/(dashboard)/categories/actions", () => ({
  updateCategoryAction: (...a: unknown[]) => updateCategoryAction(...a),
  createCategoryAction: (...a: unknown[]) => createCategoryAction(...a),
  deleteCategoryAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CategoryDialog } from "@/components/categories/category-dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";

const CAT = "22222222-2222-4222-8222-222222222222";

describe("T2aR parseTransactionFilters (searchParams injection / abuse)", () => {
  it("never throws and drops garbage", () => {
    const f = parseTransactionFilters({
      page: "abc", pageSize: "100000", from: "2026-02-30", to: "x,category_id.eq.1",
      categoryId: "1) or (user_id.neq.x", type: "income",
    });
    expect(f).toEqual({ page: 1, pageSize: 10, from: undefined, to: undefined, categoryId: undefined, type: undefined });
  });
  it.each([["0"], ["-3"], ["1.5"], ["1e9"], ["NaN"], [""]])("page=%j falls back to 1", (p) => {
    expect(parseTransactionFilters({ page: p }).page).toBe(1);
  });
  it("caps pageSize, uses first of repeated params, swaps inverted ranges", () => {
    expect(parseTransactionFilters({ pageSize: "51" }).pageSize).toBe(10);
    expect(parseTransactionFilters({ pageSize: "50" }).pageSize).toBe(50);
    expect(parseTransactionFilters({ type: ["EXPENSE", "INCOME"] }).type).toBe("EXPENSE");
    const r = parseTransactionFilters({ from: "2026-05-01", to: "2026-01-01" });
    expect(r.from).toBe("2026-01-01");
    expect(r.to).toBe("2026-05-01");
  });
  it("accepts a valid uuid category and type", () => {
    expect(parseTransactionFilters({ categoryId: CAT, type: "INCOME" })).toMatchObject({ categoryId: CAT, type: "INCOME" });
  });
});

describe("T2aR CategoryDialog edit mode", () => {
  const category = { id: CAT, user_id: "u", name: "Comida", type: "EXPENSE" as const, color: "#f59e0b", created_at: "" };

  it("submits an edit even though the type select is disabled", async () => {
    const user = userEvent.setup();
    render(<CategoryDialog open onOpenChange={vi.fn()} category={category} />);
    expect(screen.getByLabelText("Tipo")).toBeDisabled();
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Comida 2");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(updateCategoryAction).toHaveBeenCalled());
    expect(updateCategoryAction.mock.calls[0][0]).toBe(CAT);
    expect(updateCategoryAction.mock.calls[0][1]).toMatchObject({ name: "Comida 2", color: "#f59e0b" });
  });

  it("dialog is labelled (accessible name) and color swatches are radios", () => {
    render(<CategoryDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Nueva categoría" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").length).toBe(12);
  });
});

describe("T2aR TransactionForm duplicate submit", () => {
  it("double Enter in the amount field results in a single server call", async () => {
    let resolve!: (v: { ok: boolean }) => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(
      <TransactionForm
        categories={[{ id: CAT, name: "Comida", type: "EXPENSE" }]}
        onSubmit={onSubmit}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Categoría"), CAT);
    await user.type(screen.getByLabelText("Monto"), "5");
    await user.keyboard("{Enter}{Enter}{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve({ ok: true });
  });

  it("amount with a single decimal comma is accepted and normalized to a dot", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <TransactionForm categories={[{ id: CAT, name: "Comida", type: "EXPENSE" }]} onSubmit={onSubmit} onSuccess={vi.fn()} onCancel={vi.fn()} />,
    );
    await user.selectOptions(screen.getByLabelText("Categoría"), CAT);
    await user.type(screen.getByLabelText("Monto"), "10,50");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].amount).toBe("10.50");
  });

  it.each(["1,234.56", "1.234,56", "1,2,3", "10,505"])("amount %s is rejected on the client", async (v) => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TransactionForm categories={[{ id: CAT, name: "Comida", type: "EXPENSE" }]} onSubmit={onSubmit} onSuccess={vi.fn()} onCancel={vi.fn()} />,
    );
    await user.selectOptions(screen.getByLabelText("Categoría"), CAT);
    await user.type(screen.getByLabelText("Monto"), v);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText(/Monto inválido|Máximo 2 decimales/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
