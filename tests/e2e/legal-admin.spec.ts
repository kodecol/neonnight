import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Cambia las páginas legales compartidas: corre en serie, al final (proyecto "inicio").
test.describe.configure({ mode: "serial" });

const ADDED = "Texto agregado desde el panel de pruebas.";

test.describe("Panel › Legales", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
  });

  test("edita /terminos: vista previa, publicar, volver a fábrica y recuperar una versión", async ({ page, context }) => {
    await page.goto("/admin/legales");
    await expect(page.getByTestId("legal-terminos")).toContainText("Texto de fábrica");
    await page.getByTestId("legal-terminos").click();
    await expect(page).toHaveURL(/\/admin\/legales\/terminos$/);

    const body = page.getByTestId("legal-body");
    await expect(body).toHaveValue(/\{correo\}/);
    // Un error de formato se marca al escribir y no deja publicar.
    await body.fill(`${await body.inputValue()}\n::: pasos\nSin separador\n:::\n`);
    await expect(page.getByTestId("legal-issues")).toContainText("Título — texto");
    await expect(page.getByTestId("legal-publish")).toBeDisabled();

    const original = (await body.inputValue()).replace(/\n::: pasos\nSin separador\n:::\n$/, "");
    await body.fill(`${original}\n## Prueba e2e {#prueba-e2e}\n\n${ADDED} Escríbenos a {correo}.\n`);
    await expect(page.getByTestId("legal-issues")).toHaveCount(0);

    // Vista previa: borrador en otra pestaña; la tienda no cambia.
    const [preview] = await Promise.all([context.waitForEvent("page"), page.getByTestId("legal-preview").click()]);
    await preview.waitForURL(/\/admin\/vista-previa\/legal\/terminos/);
    await expect(preview.getByTestId("preview-banner")).toContainText("borrador");
    await expect(preview.getByText(ADDED)).toBeVisible();
    await preview.close();
    await page.goto("/terminos");
    await expect(page.getByText(ADDED)).toHaveCount(0);

    // Publicar: versión 1.1 y el texto nuevo en la tienda, con la ficha resuelta.
    await page.goto("/admin/legales/terminos");
    await expect(page.getByTestId("legal-publish")).toHaveText("Publicar v1.1");
    await page.getByTestId("legal-publish").click();
    await expect(page.getByText("Publicada la versión 1.1")).toBeVisible();
    await page.goto("/terminos");
    await expect(page.getByText(ADDED)).toBeVisible();
    await expect(page.locator("#prueba-e2e")).toContainText("@");
    await expect(page.locator("time")).toContainText("Versión 1.1");

    // Volver al texto de fábrica (se publica como 1.2: la versión no baja) y luego recuperar la 1.1 desde el historial.
    await page.goto("/admin/legales/terminos");
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("legal-reset").click();
    await page.waitForLoadState("networkidle");
    await page.goto("/terminos");
    await expect(page.getByText(ADDED)).toHaveCount(0);
    await expect(page.locator("time")).toContainText("Versión 1.2");

    await page.goto("/admin/legales/terminos");
    await page.getByTestId("legal-versions").getByRole("button", { name: "Cargar en el editor" }).first().click();
    await expect(page.getByTestId("legal-body")).toHaveValue(new RegExp(ADDED));
    await expect(page.getByTestId("legal-publish")).toHaveText("Publicar v1.3");
    await page.getByTestId("legal-publish").click();
    await expect(page.getByText("Publicada la versión 1.3")).toBeVisible();
    await page.goto("/terminos");
    await expect(page.getByText(ADDED)).toBeVisible();

    // Deja /terminos con el texto de fábrica para lo que venga después.
    await page.goto("/admin/legales/terminos");
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("legal-reset").click();
    await page.waitForLoadState("networkidle");
  });

  test("los datos de la empresa llegan a las páginas", async ({ page }) => {
    await page.goto("/admin/legales");
    const hours = page.getByTestId("company-form").getByLabel("Horario de atención");
    const original = await hours.inputValue();
    await hours.fill("Lunes a viernes, de 10:00 a. m. a 6:00 p. m.");
    await page.getByTestId("save-company").click();
    await expect(page.getByText("Guardado · ya se ve en la tienda")).toBeVisible();
    await page.goto("/nosotros");
    await expect(page.getByText("Lunes a viernes, de 10:00 a. m. a 6:00 p. m.")).toBeVisible();

    await page.goto("/admin/legales");
    await page.getByTestId("company-form").getByLabel("Horario de atención").fill(original);
    await page.getByTestId("save-company").click();
    await expect(page.getByText("Guardado · ya se ve en la tienda")).toBeVisible();
  });

  test("la vista previa exige sesión del panel", async ({ browser }) => {
    const anon = await browser.newContext();
    const page = await anon.newPage();
    await page.goto("/admin/vista-previa/legal/terminos");
    await expect(page).toHaveURL(/\/admin\/login/);
    await anon.close();
  });
});
