import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Cambia la home compartida: este archivo corre en serie y deja todo como estaba.
test.describe.configure({ mode: "serial" });

test.describe("Panel › Inicio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
  });

  test("sube una foto a la biblioteca y la usa como hero y como banda", async ({ page }) => {
    await page.goto("/admin/inicio");
    await page.getByTestId("site-media").locator("input[type=file]").setInputFiles("public/assets/band-perfume.jpg");
    await expect(page.getByTestId("site-media-grid").locator("button[aria-pressed]")).toHaveCount(1, { timeout: 20_000 });

    await page.getByRole("radio", { name: "Foto o video propio" }).click();
    await page.getByTestId("hero-media").getByRole("radio").first().click();
    await page.getByTestId("hero-title").fill("Prueba de portada");
    await page.getByLabel("Enlace del botón").fill("/coleccion/perfumeria");
    await page.getByLabel("Texto del botón").fill("Ver perfumes");
    await page.getByTestId("band-media").getByRole("radio").nth(1).click();
    await page.getByLabel("Frase").fill("Una frase desde el panel");
    await page.getByTestId("save-home").click();
    await expect(page.getByText("Guardado · publicado en la home")).toBeVisible();
    await expect(page.getByTestId("site-media-grid").getByText("Hero")).toBeVisible();

    // Lo que está en uso no se puede quitar.
    await expect(page.getByTestId("site-media-remove")).toBeDisabled();

    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText("Prueba de portada");
    await expect(page.getByRole("link", { name: "Ver perfumes" })).toHaveAttribute("href", "/coleccion/perfumeria");
    await expect(page.getByText("Una frase desde el panel")).toBeVisible();
  });

  test("vuelve a la pieza destacada y la foto queda libre para quitarla", async ({ page }) => {
    await page.goto("/admin/inicio");
    await page.getByRole("radio", { name: "La pieza destacada" }).click();
    await page.getByTestId("band-media").getByRole("radio", { name: "Foto por defecto" }).click();
    await page.getByLabel("Frase").fill("");
    await page.getByTestId("save-home").click();
    await expect(page.getByText("Guardado · publicado en la home")).toBeVisible();
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("site-media-remove").click();
    await expect(page.getByTestId("site-media-grid").locator("button[aria-pressed]")).toHaveCount(0);

    await page.goto("/");
    await expect(page.locator("#hero-title")).not.toHaveText("Prueba de portada");
  });
});
