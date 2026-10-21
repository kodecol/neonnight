import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Solo casos que no cambian la contraseña ni la versión de sesión: los demás
// tests del panel corren en paralelo con la misma cuenta. El cambio real y el
// cierre de sesiones están cubiertos en tests/unit/security.test.ts.
test.describe("Panel › Cuenta", () => {
  test("muestra el origen de la contraseña y valida el cambio en el servidor", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);

    await page.getByRole("link", { name: "Cuenta" }).first().click();
    await expect(page).toHaveURL(/\/admin\/cuenta$/);
    await expect(page.getByTestId("password-origin")).toContainText("ADMIN_PASSWORD");

    await page.getByLabel("Contraseña actual", { exact: true }).fill("no-es-la-actual");
    await page.getByLabel("Contraseña nueva", { exact: true }).fill("una frase nueva bastante larga");
    await page.getByLabel("Repite la contraseña nueva").fill("una frase nueva bastante larga");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("La contraseña actual no es correcta.").first()).toBeVisible();

    await page.getByLabel("Contraseña actual", { exact: true }).fill(E2E_ADMIN_PASSWORD);
    await page.getByLabel("Repite la contraseña nueva").fill("otra distinta de la nueva");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("No coincide con la contraseña nueva.").first()).toBeVisible();
  });
});
