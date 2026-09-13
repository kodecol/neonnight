import { expect, test } from "@playwright/test";

test.describe("Navegación entre las tres vistas", () => {
  test("home → colección → detalle con rutas reales", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Day-Date 36/i);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(6);

    await page.getByRole("link", { name: /Ver las 8 referencias/i }).click();
    await expect(page).toHaveURL(/\/coleccion$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Colección/i);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(8);

    await page.locator("[data-testid=product-card] a").first().click();
    await expect(page).toHaveURL(/\/reloj\/rolex-day-date-36$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Rolex Day-Date 36/i);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain('"@type":"Product"');
  });

  test("los filtros de colección son server-side por searchParams", async ({ page }) => {
    await page.goto("/coleccion?categoria=cronografo");
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Cronógrafos" })).toHaveAttribute("aria-current", "page");
    await page.goto("/coleccion?max=15000000");
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(4);
  });

  test("slug inexistente devuelve 404", async ({ page }) => {
    const res = await page.goto("/reloj/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/no encontrada/i);
  });

  test("un solo h1 por página y metadata por ruta", async ({ page }) => {
    for (const path of ["/", "/coleccion", "/reloj/rolex-day-date-36"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    }
    await expect(page).toHaveTitle("Rolex Day-Date 36 — Neon Night");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/reloj\/rolex-day-date-36$/);
  });

  test("sitemap y robots se generan desde el repositorio", async ({ request }) => {
    const sm = await request.get("/sitemap.xml");
    expect(sm.ok()).toBeTruthy();
    const xml = await sm.text();
    expect(xml).toContain("/reloj/rolex-day-date-36");
    expect(xml).toContain("/reloj/modelo-08");
    const rb = await request.get("/robots.txt");
    expect(await rb.text()).toContain("sitemap.xml");
  });
});
