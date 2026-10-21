import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Cambia el tema compartido: corre en el proyecto "inicio" y lo deja como estaba.
test.describe.configure({ mode: "serial" });

const accentOf = (page: import("@playwright/test").Page) => page.getByTestId("cart-count").evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe("Ajustes › Apariencia", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
  });

  test("un preset y una fuente se ven en la tienda; volver a la de fábrica", async ({ page }) => {
    await page.goto("/");
    expect(await accentOf(page)).toBe("rgb(255, 0, 110)");

    await page.goto("/admin/ajustes/apariencia");
    // Un tema sin contraste no se puede publicar.
    await page.getByTestId("color-ink2").fill("#333333");
    await expect(page.getByTestId("contrast-checks")).toContainText("✗");
    await expect(page.getByTestId("appearance-publish")).toBeDisabled();

    await page.getByTestId("preset-zafiro").click();
    await page.getByTestId("font-display").selectOption("playfair-display");
    await expect(page.getByTestId("contrast-checks")).not.toContainText("✗");
    await page.getByTestId("appearance-publish").click();
    await expect(page.getByText("Publicada en la tienda")).toBeVisible();

    await page.goto("/");
    expect(await accentOf(page)).toBe("rgb(47, 91, 234)");
    expect(await page.locator("#hero-title").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Playfair/i);
    // Un h2 con estilo de rótulo sigue con la fuente del cuerpo.
    expect(await page.locator("#brands-label").evaluate((el) => getComputedStyle(el).fontFamily)).not.toMatch(/Playfair/i);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#05070d");

    await page.goto("/admin/ajustes/apariencia");
    await page.getByTestId("appearance-factory").click();
    await page.getByTestId("appearance-publish").click();
    await expect(page.getByText("Publicada en la tienda")).toBeVisible();
    await page.goto("/");
    expect(await accentOf(page)).toBe("rgb(255, 0, 110)");
  });

  test("el editor no se desborda en móvil (390 px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/ajustes/apariencia");
    await expect(page.getByTestId("appearance-editor")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });

  test("la vista previa de apariencia exige sesión", async ({ browser }) => {
    const anon = await browser.newContext();
    const p = await anon.newPage();
    await p.goto("/admin/vista-previa/apariencia");
    await expect(p).toHaveURL(/\/admin\/login/);
    await anon.close();
  });
});
