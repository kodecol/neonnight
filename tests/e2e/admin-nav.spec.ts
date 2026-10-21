import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.fill("#password", E2E_ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin\/catalogo$/);
}

test.describe("Panel › Menú", () => {
  test("escritorio: grupos, Ajustes con pestañas y rutas viejas redirigidas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    const nav = page.getByRole("navigation", { name: "Panel" });
    for (const group of ["Operación", "Sitio", "Configuración"]) await expect(nav.getByRole("group", { name: new RegExp(group) })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Catálogo" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Ajustes" }).click();
    await expect(page).toHaveURL(/\/admin\/ajustes\/pagos$/);
    await expect(nav.getByRole("link", { name: "Ajustes" })).toHaveAttribute("aria-current", "page");
    const tabs = page.getByRole("navigation", { name: "Ajustes" });
    await expect(tabs.getByRole("link", { name: "Pagos" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Seguridad" }).click();
    await expect(page).toHaveURL(/\/admin\/ajustes\/seguridad$/);
    await expect(nav.getByRole("link", { name: "Ajustes" })).toHaveAttribute("aria-current", "page");

    await page.goto("/admin/pagos");
    await expect(page).toHaveURL(/\/admin\/ajustes\/pagos$/);
    await page.goto("/admin/cuenta");
    await expect(page).toHaveURL(/\/admin\/ajustes\/seguridad$/);
    await page.goto("/admin/ajustes");
    await expect(page).toHaveURL(/\/admin\/ajustes\/pagos$/);
  });

  test("móvil: el menú abre a pantalla completa, navega y se cierra", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const toggle = page.getByRole("button", { name: /Abrir menú/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const menu = page.getByTestId("admin-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("group", { name: /Configuración/ })).toBeVisible();
    await menu.getByRole("link", { name: "Pedidos" }).click();
    await expect(page).toHaveURL(/\/admin\/pedidos$/);
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: /Abrir menú/ }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("admin-menu")).toBeHidden();
  });
});
