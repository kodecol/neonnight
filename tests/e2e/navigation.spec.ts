import { expect, test } from "@playwright/test";

test.describe("Navegación entre las tres vistas", () => {
  test("home → colección → detalle con rutas reales", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Sky-Dweller/i);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(6);
    const social = page.locator("[data-testid=social-links] a");
    await expect(social).toHaveCount(4);
    await expect(social.first()).toHaveAttribute("target", "_blank");
    await expect(page.locator("#autenticidad")).toContainText("Garantía de 12 meses");
    await expect(page.locator("footer")).not.toContainText("Financiación");
    await expect(page.locator("#marcas li")).toHaveText(["Rolex", "Omega", "Cartier", "Tudor"]);
    await expect(page.locator("[data-testid=payment-methods] li")).toHaveCount(8);
    await expect(page.locator("[data-testid=payment-methods] img")).toHaveCount(7);
    const order = await page.locator("main > section[id]").evaluateAll((els) => els.map((e) => e.id));
    expect(order.indexOf("clientes")).toBeGreaterThan(order.indexOf("autenticidad"));
    expect(order.indexOf("pagos")).toBe(order.indexOf("redes") - 1);

    await page.getByRole("link", { name: /Ver las 8 referencias/i }).click();
    await expect(page).toHaveURL(/\/coleccion$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Colección/i);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(8);

    await page.locator("[data-testid=product-card] a").first().click();
    await expect(page).toHaveURL(/\/reloj\/rolex-sky-dweller-326938$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Rolex Sky-Dweller/i);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain('"@type":"Product"');
  });

  test("los filtros de colección son server-side por searchParams", async ({ page }) => {
    await page.goto("/coleccion?categoria=cronografo");
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Cronógrafos" })).toHaveAttribute("aria-current", "page");
    await page.goto("/coleccion?max=35000000");
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(4);
  });

  test("slug inexistente devuelve 404", async ({ page }) => {
    const res = await page.goto("/reloj/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/no encontrada/i);
  });

  test("un solo h1 por página y metadata por ruta", async ({ page }) => {
    for (const path of ["/", "/coleccion", "/reloj/rolex-sky-dweller-326938"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    }
    await expect(page).toHaveTitle("Rolex Sky-Dweller — Neon Night");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/reloj\/rolex-sky-dweller-326938$/);
  });

  test("sitemap y robots se generan desde el repositorio", async ({ request }) => {
    const sm = await request.get("/sitemap.xml");
    expect(sm.ok()).toBeTruthy();
    const xml = await sm.text();
    expect(xml).toContain("/reloj/rolex-sky-dweller-326938");
    expect(xml).toContain("/reloj/omega-seamaster-diver-300m");
    const rb = await request.get("/robots.txt");
    expect(await rb.text()).toContain("sitemap.xml");
  });
});
