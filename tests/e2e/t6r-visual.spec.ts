import { expect, test } from "@playwright/test";

// Anonymous-only visual/a11y smoke for the T6 redesign. Screenshots go to E2E_SHOT_DIR when set.
const PAGES = ["/login", "/register", "/forgot-password"];
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 800 },
  { name: "mobile", width: 375, height: 700 },
];

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    test(`${path} @${vp.name}: no horizontal overflow, one h1, logo loaded`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const logo = page.getByRole("img", { name: "FinTrack" });
      await expect(logo).toBeVisible();
      const loaded = await logo.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
      expect(loaded).toBe(true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const dir = process.env.E2E_SHOT_DIR;
      if (dir) await page.screenshot({ path: `${dir}/${vp.name}${path.replace("/", "-")}.png`, fullPage: true });
    });
  }
}

test("logo is served from the local origin only (no remote image host)", async ({ page }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => {
    if (r.resourceType() === "image") hosts.add(new URL(r.url()).host);
  });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  expect([...hosts].every((h) => h.startsWith("localhost"))).toBe(true);
});

test("reduced motion is honoured on the auth card", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  const dur = await page.locator(".ft-fade-in").first().evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(dur)).toBeLessThan(0.01);
});
