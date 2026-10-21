import { expect, test, type Page } from "@playwright/test";

// Hallazgos del QA de la tienda pública (UX, accesibilidad y rendimiento).
const PHONE = { width: 390, height: 844 };
const INFO = ["/privacidad", "/envios", "/pagos", "/garantia", "/nosotros", "/terminos", "/devoluciones"];

test.beforeEach(async ({ context }) => {
  // Sin la pantalla de carga: ya se vio en la sesión.
  await context.addInitScript(() => sessionStorage.setItem("neonnight.loaded", "1"));
});

const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test.describe("Tienda: móvil", () => {
  test.use({ viewport: PHONE });

  test("el video vertical no se descarga hasta acercarse", async ({ page }) => {
    const videos: string[] = [];
    page.on("request", (r) => {
      if (/\.mp4(\?|$)/.test(r.url()) && !r.url().includes("hero")) videos.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(videos).toEqual([]);
    const video = page.locator("#motion-title").locator("xpath=ancestor::section").locator("video");
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  });

  test("las páginas informativas y /gracias no se desbordan; cada tabla con su nombre", async ({ page }) => {
    for (const path of [...INFO, "/gracias"]) {
      await page.goto(path);
      expect(await scrollWidth(page), path).toBe(PHONE.width);
    }
    await page.goto("/privacidad");
    const names = await page.locator('[role="region"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names).size).toBe(names.length);
  });

  test("el panel de filtros sube bajo el header y esconde el botón de WhatsApp", async ({ page }) => {
    await page.goto("/coleccion/perfumeria");
    await expect(page.getByTestId("whatsapp-fab")).toBeVisible();
    await page.getByTestId("filter-panel").locator("summary").click();
    await expect.poll(() => page.getByTestId("catalog-toolbar").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThan(100);
    await expect(page.getByTestId("whatsapp-fab")).toBeHidden();
  });

  test("los botones de testimonios miden al menos 24 × 24 px", async ({ page }) => {
    await page.goto("/");
    const sizes = await page.getByRole("group", { name: "Elegir testimonio" }).locator("button").evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(24);
  });
});

test.describe("Tienda: teléfono angosto (360 px)", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("la barra del catálogo y los títulos de Nosotros caben", async ({ page }) => {
    for (const path of ["/coleccion", "/coleccion/relojeria", "/coleccion/perfumeria", "/nosotros"]) {
      await page.goto(path);
      expect(await scrollWidth(page), path).toBe(360);
    }
  });
});

test.describe("Tienda: foco y formularios", () => {
  test("la bolsa atrapa el foco y lo devuelve al botón que la abrió; vacía no deja finalizar", async ({ page }) => {
    await page.goto("/reloj/rolex-sky-dweller-326938");
    const add = page.getByTestId("add-rolex-sky-dweller-326938");
    await add.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#cart-drawer")).toBeVisible();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest("#cart-drawer")))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(add).toBeFocused();

    await page.getByTestId("cart-count").click();
    await page.locator("#cart-drawer").getByRole("button", { name: /quitar/i }).click();
    await expect(page.getByTestId("checkout-button")).toBeDisabled();
  });

  test("el menú devuelve el foco al botón Menú", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: /menú/i }).first();
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#site-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  });

  test("tras un rechazo del servidor: foco en el primer campo inválido y un solo aviso", async ({ page }) => {
    await page.goto("/reloj/rolex-sky-dweller-326938");
    await page.getByTestId("add-rolex-sky-dweller-326938").click();
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-total")).toBeVisible();
    const form = page.getByTestId("checkout-form");
    await form.getByLabel("Nombre completo").fill("Ab");
    await form.getByLabel("Número de documento").fill("12");
    await page.getByTestId("checkout-consent").locator("input").check();
    await page.getByTestId("checkout-submit").click();
    await expect(page.getByTestId("checkout-error")).toBeVisible();
    await expect(form.getByLabel("Nombre completo")).toBeFocused();
    // Solo el resumen (el anunciador de rutas de Next también es role=alert, vacío).
    await expect(page.locator('[role="alert"]').filter({ hasText: /\S/ })).toHaveCount(1);
    // El documento se marca aunque falten otros datos (departamento sin elegir).
    await expect(form.getByLabel("Número de documento")).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByLabel("Número de documento")).toHaveAttribute("aria-describedby", "checkout-documentNumber-error");
  });

  test("el nombre accesible de 'Ver pieza' contiene el texto visible", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("[data-testid^=view-]").first();
    const [label, text] = await link.evaluate((a) => [a.getAttribute("aria-label") ?? "", a.textContent?.trim() ?? ""]);
    expect(label.toLowerCase()).toContain(text.toLowerCase());
  });
});

test("el 404 lleva su título y un solo meta robots", async ({ request }) => {
  for (const path of ["/no-existe-esta-pagina", "/reloj/no-existe"]) {
    const res = await request.get(path);
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toMatch(/<title>Página no encontrada — /);
    expect([...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((m) => m[1])).toEqual(["noindex"]);
  }
});
