import { expect, test } from "@playwright/test";

for (const path of ["/login", "/register", "/forgot-password"]) {
  test(`no broken image/asset requests on ${path}`, async ({ page }) => {
    const bad: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) bad.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    page.on("requestfailed", (r) => bad.push(`failed ${new URL(r.url()).pathname}`));
    await page.goto(path, { waitUntil: "networkidle" });
    const broken = await page.evaluate(() =>
      Array.from(document.images).filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.src),
    );
    expect(broken).toEqual([]);
    expect(bad).toEqual([]);
    const html = await page.content();
    expect(html).not.toMatch(/logo-original|logo-transparent/);
  });
}
