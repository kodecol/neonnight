import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Cambia marcas y productos compartidos: corre en serie y deja todo como estaba.
test.describe.configure({ mode: "serial" });

const LOGO = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 60"><path d="M0 0h300v60H0z"/></svg>`;

test.describe("Panel › Marcas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
  });

  test("crea una marca con logo, la asigna a una pieza, sale en el marquee y no se puede borrar mientras tenga productos", async ({ page }) => {
    await page.goto("/admin/marcas");
    await page.getByTestId("brand-new").click();
    const editor = page.getByTestId("brand-editor");
    await editor.getByLabel("Nombre").fill("Patek Philippe");
    await editor.locator("input[type=file]").setInputFiles({ name: "patek.svg", mimeType: "image/svg+xml", buffer: Buffer.from(LOGO) });
    await expect(editor.getByTestId("brand-logo-upload")).toHaveText("Reemplazar logo", { timeout: 20_000 });
    await editor.getByLabel("Color en hexadecimal").fill("#1B4F72");
    await editor.getByTestId("brand-save").click();
    const row = page.getByTestId("brand-patek-philippe");
    await expect(row).toContainText("0 productos · no aparece: sin productos");

    // Un SVG con script se rechaza.
    await row.getByRole("button", { name: "Editar" }).click();
    await page.getByTestId("brand-editor").locator("input[type=file]").setInputFiles({ name: "malo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(LOGO.replace("<path", "<script>alert(1)</script><path")) });
    await expect(page.getByTestId("brand-editor")).toContainText("scripts");
    await page.getByTestId("brand-editor").getByRole("button", { name: "Cancelar" }).click();

    // Asignarla a una pieza desde el formulario (y crear otra al vuelo).
    await page.goto("/admin/catalogo/w-03");
    const picker = page.getByTestId("brand-picker");
    const original = await picker.inputValue();
    await picker.fill("Marca Al Vuelo");
    await page.getByTestId("brand-create").click();
    await expect(picker).toHaveValue("Marca Al Vuelo");
    await picker.fill("patek philippe");
    await picker.blur();
    await expect(picker).toHaveValue("Patek Philippe");
    await page.getByTestId("save-product").click();
    await expect(page.getByText("Guardado · publicado en la tienda")).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("brand-marquee").locator("ul.sr-only")).toContainText("Patek Philippe");

    await page.goto("/admin/marcas");
    await page.getByTestId("brand-patek-philippe").getByRole("button", { name: "Editar" }).click();
    await expect(page.getByTestId("brand-delete")).toBeDisabled();
    await expect(page.getByTestId("brand-delete")).toContainText("1 producto");

    // Deja la pieza como estaba y borra las marcas de prueba.
    await page.goto("/admin/catalogo/w-03");
    await page.getByTestId("brand-picker").fill(original);
    await page.getByTestId("save-product").click();
    await expect(page.getByText("Guardado · publicado en la tienda")).toBeVisible();
    await page.goto("/admin/marcas");
    for (const slug of ["patek-philippe", "marca-al-vuelo"]) {
      await page.getByTestId(`brand-${slug}`).getByRole("button", { name: "Editar" }).click();
      page.once("dialog", (d) => void d.accept());
      await page.getByTestId("brand-delete").click();
      await expect(page.getByTestId(`brand-${slug}`)).toHaveCount(0);
    }
  });

  test("el rótulo del marquee se edita y vuelve al de siempre", async ({ page }) => {
    await page.goto("/admin/marcas");
    const form = page.getByTestId("brands-copy");
    await form.getByLabel("Rótulo").fill("Casas que verificamos");
    await form.getByRole("button", { name: "Guardar textos" }).click();
    await expect(form).toContainText("Guardado");
    await page.goto("/");
    await expect(page.getByTestId("brand-marquee")).toContainText("Casas que verificamos");

    await page.goto("/admin/marcas");
    await page.getByTestId("brands-copy").getByLabel("Rótulo").fill("");
    await page.getByTestId("brands-copy").getByRole("button", { name: "Guardar textos" }).click();
    await expect(page.getByTestId("brands-copy")).toContainText("Guardado");
  });
});
