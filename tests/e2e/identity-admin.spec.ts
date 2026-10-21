import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Cambia la identidad compartida: corre en el proyecto "inicio" y la deja como estaba.
test.describe.configure({ mode: "serial" });

test.describe("Panel › Identidad", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
  });

  test("cambiar el nombre se ve en la barra, el título y el pie; volver a la de fábrica", async ({ page, context }) => {
    await page.goto("/admin/ajustes/identidad");
    await page.getByTestId("identity-name").fill("Casa Aurora");
    await page.getByTestId("identity-wordmark").fill("CASA AURORA");

    // Vista previa: la tienda con el borrador, sin publicar.
    const [preview] = await Promise.all([context.waitForEvent("page"), page.getByTestId("identity-preview-open").click()]);
    await preview.waitForURL(/\/admin\/vista-previa\/identidad/);
    await expect(preview.getByRole("link", { name: "Casa Aurora, inicio" }).first()).toBeVisible();
    await preview.close();
    await page.goto("/");
    await expect(page).toHaveTitle(/Tu tienda/);

    await page.goto("/admin/ajustes/identidad");
    await expect(page.getByText("Borrador sin publicar", { exact: true })).toBeVisible();
    await page.getByTestId("identity-publish").click();
    await expect(page.getByText("Publicado en la tienda")).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveTitle(/Casa Aurora/);
    await expect(page.getByRole("link", { name: "Casa Aurora, inicio" }).first()).toBeVisible();
    await expect(page.getByTestId("site-footer")).toContainText(/© \d{4} Casa Aurora/);
    await expect(page.getByTestId("site-footer")).toContainText("CASA AURORA");
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain('"name":"Casa Aurora"');

    // 404 con la identidad vigente.
    await page.goto("/no-existe-esta-pagina");
    await expect(page.getByTestId("not-found")).toContainText("Casa Aurora");

    // Volver a la identidad de fábrica.
    await page.goto("/admin/ajustes/identidad");
    await page.getByTestId("identity-factory").click();
    await expect(page.getByTestId("identity-name")).toHaveValue("Tu tienda");
    await page.getByTestId("identity-publish").click();
    await expect(page.getByText("Publicado en la tienda")).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveTitle(/Tu tienda/);
  });

  test("la vista previa de identidad exige sesión", async ({ browser }) => {
    const anon = await browser.newContext();
    const page = await anon.newPage();
    await page.goto("/admin/vista-previa/identidad");
    await expect(page).toHaveURL(/\/admin\/login/);
    await anon.close();
  });
});
