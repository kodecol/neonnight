import { expect, test } from "@playwright/test";

const PAGES = [
  ["/nosotros", /sin vitrina/i],
  ["/envios", /Envíos/],
  ["/pagos", /Pagos/],
  ["/garantia", /Garantía/],
  ["/devoluciones", /devoluciones/i],
  ["/terminos", /Términos/],
  ["/privacidad", /Privacidad/],
] as const;

test.describe("Páginas institucionales y legales", () => {
  for (const [path, title] of PAGES) {
    test(`${path} carga con título, canonical y vista previa`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText(title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/og/);
    });
  }

  test("el pie de página lleva a las páginas legales y a la SIC", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByTestId("site-footer");
    await expect(footer).toContainText("Matrícula mercantil 3812180");
    await expect(footer.getByRole("link", { name: "Superintendencia de Industria y Comercio" })).toHaveAttribute("href", "https://www.sic.gov.co");
    await footer.getByRole("link", { name: "Garantía" }).click();
    await expect(page).toHaveURL(/\/garantia$/);
    await page.getByRole("navigation", { name: "En esta página" }).getByRole("link", { name: /Qué no cubre/ }).click();
    await expect(page).toHaveURL(/#que-no-cubre$/);
  });

  test("las fichas venden sin WhatsApp: comprar ahora o añadir a la bolsa", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid=product-card] a[href*="wa.me"]')).toHaveCount(0);
    await page.goto("/reloj/rolex-cosmograph-daytona-126500ln");
    await expect(page.getByTestId("add-rolex-cosmograph-daytona-126500ln")).toBeVisible();
    await page.getByTestId("buy-rolex-cosmograph-daytona-126500ln").click();
    // Sin pasarela activa el checkout termina en /gracias; la bolsa no se toca.
    await expect(page).toHaveURL(/\/gracias\?orden=/);
    await expect(page.getByTestId("cart-count")).toHaveText("0");
  });

  test("la bolsa avisa de los términos antes de pagar", async ({ page }) => {
    await page.goto("/reloj/rolex-sky-dweller-326938");
    await page.getByTestId("add-rolex-sky-dweller-326938").click();
    const note = page.getByTestId("cart-legal");
    await expect(note).toContainText("términos y condiciones");
    await note.getByRole("link", { name: "política de privacidad" }).click();
    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.locator("#cart-drawer")).toHaveCount(0);
  });

  test("las imágenes de vista previa y el sitemap responden", async ({ request }) => {
    for (const url of ["/og", "/og?linea=relojeria"]) {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const [path] of PAGES) expect(sitemap).toContain(`${path}</loc>`);
  });
});
