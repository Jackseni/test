import { expect, test } from "@playwright/test";

// No Supabase credentials needed: the proxy resolves "no session" locally
// (no cookie => no network call), so these run with dummy NEXT_PUBLIC_* values.

const PRIVATE = ["/dashboard", "/transactions", "/categories", "/budgets", "/reports"];

test.describe("anonymous access", () => {
  for (const path of PRIVATE) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    });
  }

  test("nested private path and query are gated", async ({ page }) => {
    await page.goto("/transactions?page=2&type=EXPENSE");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("root redirects anonymous users to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("security headers are present and X-Powered-By is absent", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("private route response redirect does not leak content", async ({ request }) => {
    const res = await request.get("/dashboard", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toMatch(/\/login$/);
  });
});

test.describe("login page", () => {
  test("renders and shows client validation messages without calling the server", async ({ page }) => {
    let serverActionCalls = 0;
    page.on("request", (r) => {
      if (r.method() === "POST") serverActionCalls++;
    });
    await page.goto("/login");
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText("Ingresa tu correo electrónico")).toBeVisible();
    await expect(page.getByText("Ingresa tu contraseña")).toBeVisible();
    await page.getByLabel("Correo electrónico").fill("no-es-correo");
    await page.getByLabel("Contraseña").fill("x");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText("Correo electrónico inválido")).toBeVisible();
    expect(serverActionCalls).toBe(0);
  });

  test("links to register and forgot-password", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Regístrate" }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});

test.describe("register page", () => {
  test("client validation: empty, short password, mismatch", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Ingresa tu nombre")).toBeVisible();
    await page.getByLabel("Nombre completo").fill("Ana");
    await page.getByLabel("Correo electrónico").fill("ana@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("short");
    await page.getByLabel("Confirmar contraseña").fill("short");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("La contraseña debe tener al menos 8 caracteres")).toBeVisible();
    await page.getByLabel("Contraseña", { exact: true }).fill("longenough1");
    await page.getByLabel("Confirmar contraseña").fill("different123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible();
  });
});
