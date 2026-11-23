import { expect, test } from "@playwright/test";

/**
 * Full flow against a REAL Supabase project (writes data). Skipped unless
 * E2E_SUPABASE_CONFIGURED=1 and E2E_USER_EMAIL / E2E_USER_PASSWORD are set.
 * Use a dedicated test project with email confirmation disabled (or a pre-confirmed user).
 * NOT VERIFIED in CI/no-credentials environments.
 */
const configured =
  process.env.E2E_SUPABASE_CONFIGURED === "1" && !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.skip(!configured, "requires E2E_SUPABASE_CONFIGURED=1, E2E_USER_EMAIL, E2E_USER_PASSWORD");

test("register(or login) -> category -> transaction -> budget -> dashboard -> logout", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL!;
  const password = process.env.E2E_USER_PASSWORD!;
  const suffix = Date.now().toString(36);
  const catName = `E2E-${suffix}`;

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/categories");
  await page.getByRole("button", { name: /Nueva categoría/ }).click();
  const catDialog = page.getByRole("dialog");
  await catDialog.getByLabel("Nombre", { exact: true }).fill(catName);
  await catDialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(catDialog).toBeHidden();
  await expect(page.getByText(catName)).toBeVisible();

  await page.goto("/transactions");
  await page.getByRole("button", { name: /Nueva transacción/ }).click();
  const txDialog = page.getByRole("dialog");
  await txDialog.getByLabel("Categoría", { exact: true }).selectOption({ label: catName });
  await txDialog.getByLabel("Monto", { exact: true }).fill("10,50");
  await txDialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(txDialog).toBeHidden();
  await expect(page.getByText(/10[.,]50/).first()).toBeVisible();

  await page.goto("/budgets");
  await expect(page.getByRole("heading", { name: /Presupuestos/ })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Dashboard|Resumen/ })).toBeVisible();

  // Desktop viewport: the sidebar "Cerrar sesión" button is visible (the top-bar user menu has a second one inside a menu).
  await page.getByRole("button", { name: /Cerrar sesión/ }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
