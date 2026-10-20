import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

test.describe("Panel de administración", () => {
  test("sin sesión todo /admin redirige al login", async ({ page }) => {
    await page.goto("/admin/catalogo");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/pagos");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("login, editar un reloj y verlo publicado en la tienda", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", "incorrecta");
    await page.click("button[type=submit]");
    await expect(page.getByText("Contraseña incorrecta.")).toBeVisible();

    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
    await expect(page.locator("[data-testid=catalog-rows] li")).toHaveCount(8);

    await page.getByRole("link", { name: /Cartier Santos/i }).click();
    await expect(page).toHaveURL(/\/admin\/catalogo\/w-07$/);
    const subtitle = page.getByLabel("Subtítulo");
    const original = await subtitle.inputValue();
    await subtitle.fill("Edición e2e · 39,8 mm");
    await page.getByTestId("save-watch").click();
    await expect(page.getByText("Guardado · publicado en la tienda")).toBeVisible();

    await page.goto("/reloj/cartier-santos-de-cartier-large-wssa0018");
    await expect(page.getByText("Edición e2e · 39,8 mm").first()).toBeVisible();

    // Restaura para no afectar a otros tests
    await page.goto("/admin/catalogo/w-07");
    await page.getByLabel("Subtítulo").fill(original);
    await page.getByTestId("save-watch").click();
    await expect(page.getByText("Guardado · publicado en la tienda")).toBeVisible();
  });

  test("health expone estado y versión sin caché", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(await res.json()).toMatchObject({ status: "ok", db: "memoria" });
    const deep = await request.get("/api/health?deep=1");
    expect(await deep.json()).toMatchObject({ status: "ok", categories: 4 });
  });

  test("el webhook de Bold rechaza firmas inválidas", async ({ request }) => {
    const res = await request.post("/api/webhooks/bold", { data: { type: "SALE_APPROVED" }, headers: { "x-bold-signature": "nope" } });
    expect(res.status()).toBe(401);
  });
});
