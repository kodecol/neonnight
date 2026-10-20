import { expect, test } from "@playwright/test";

test.describe("Navegación entre las tres vistas", () => {
  test("home → colección → detalle con rutas reales", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Sky-Dweller/i);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(6);
    const social = page.locator("[data-testid=social-links] a");
    await expect(social).toHaveCount(3);
    await expect(social.first()).toHaveAttribute("target", "_blank");
    await expect(page.locator("#autenticidad")).toContainText("Garantía de 12 meses");
    await expect(page.locator("footer")).not.toContainText("Financiación");
    // Marcas de las tres líneas, de la más a la menos representada.
    await expect(page.locator("#marcas li").first()).toHaveText("Cartier");
    await expect(page.locator("#marcas li").filter({ hasText: /^(Chanel|Van Cleef & Arpels|Rolex)$/ })).toHaveCount(3);
    await expect(page.getByTestId("line-showcase").getByRole("link")).toHaveCount(3);
    await expect(page.locator("[data-testid=payment-methods] li")).toHaveCount(8);
    await expect(page.locator("[data-testid=payment-methods] img")).toHaveCount(7);
    const order = await page.locator("main > section[id]").evaluateAll((els) => els.map((e) => e.id));
    expect(order.indexOf("clientes")).toBeGreaterThan(order.indexOf("autenticidad"));
    expect(order.indexOf("pagos")).toBe(order.indexOf("redes") - 1);

    await page.getByRole("link", { name: /Ver las 30 piezas/i }).click();
    await expect(page).toHaveURL(/\/coleccion$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Colección/i);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(30);

    await page.locator("[data-testid=product-card] a").first().click();
    await expect(page).toHaveURL(/\/perfume\/creed-aventus$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Creed Aventus/i);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain('"@type":"Product"');
  });

  test("los filtros de colección son server-side por searchParams", async ({ page }) => {
    await page.goto("/coleccion?categoria=cronografo");
    await expect(page).toHaveURL(/\/coleccion\/relojeria\?categoria=cronografo$/);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(2);
    await expect(page.getByRole("group", { name: "Categorías" }).getByRole("link", { name: "Cronógrafos" })).toHaveAttribute("aria-current", "page");
    await page.goto("/coleccion/relojeria?precio=hasta-20000000&orden=precio-asc");
    await expect(page.locator("[data-testid=product-card] h3")).toHaveText(["Tank Must", "Black Bay Fifty-Eight", "Snowflake"]);
    await expect(page.getByRole("group", { name: "Filtros activos" })).toContainText("Hasta 20 millones");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("un producto bajo la ruta de otra plantilla redirige a la suya", async ({ page }) => {
    await page.goto("/reloj/creed-aventus");
    await expect(page).toHaveURL(/\/perfume\/creed-aventus$/);
    const res = await page.goto("/coleccion/gafas");
    expect(res?.status()).toBe(404);
  });

  test("slug inexistente devuelve 404", async ({ page }) => {
    const res = await page.goto("/reloj/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/no encontrada/i);
  });

  test("un solo h1 por página y metadata por ruta", async ({ page }) => {
    for (const path of ["/", "/coleccion", "/coleccion/joyeria", "/joya/cartier-trinity-anillo-clasico", "/reloj/rolex-sky-dweller-326938"]) {
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
    expect(xml).toContain("/coleccion/perfumeria");
    expect(xml).toContain("/perfume/creed-aventus");
    expect(xml).toContain("/joya/cartier-trinity-anillo-clasico");
    const rb = await request.get("/robots.txt");
    expect(await rb.text()).toContain("sitemap.xml");
  });
});
