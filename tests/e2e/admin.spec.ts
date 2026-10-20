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

  test("login, editar un producto y verlo publicado en la tienda", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", "incorrecta");
    await page.click("button[type=submit]");
    await expect(page.getByText("Contraseña incorrecta.")).toBeVisible();

    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
    await expect(page.locator("[data-testid=catalog-rows] li")).toHaveCount(30);

    await page.getByRole("link", { name: /Cartier Santos/i }).click();
    await expect(page).toHaveURL(/\/admin\/catalogo\/w-07$/);
    const subtitle = page.getByLabel("Subtítulo");
    const original = await subtitle.inputValue();
    await subtitle.fill("Edición e2e · 39,8 mm");
    await page.getByTestId("save-product").click();
    await expect(page.getByText("Guardado · publicado en la tienda")).toBeVisible();

    await page.goto("/reloj/cartier-santos-de-cartier-large-wssa0018");
    await expect(page.getByText("Edición e2e · 39,8 mm").first()).toBeVisible();

    // Restaura para no afectar a otros tests
    await page.goto("/admin/catalogo/w-07");
    await page.getByLabel("Subtítulo").fill(original);
    await page.getByTestId("save-product").click();
    await expect(page.getByText("Guardado · publicado en la tienda")).toBeVisible();
  });

  test("sube una foto desde el formulario de producto (build de producción)", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
    await page.goto("/admin/catalogo/nuevo?linea=relojeria");
    // Varias fotos a la vez en la biblioteca única: la primera queda como portada.
    await page.getByTestId("media-library").locator("input[type=file]").setInputFiles(["public/assets/ref03-front.png", "public/assets/ref03-back.png"]);
    const grid = page.getByTestId("media-grid");
    await expect(grid.locator("li button[aria-pressed]")).toHaveCount(2, { timeout: 20_000 });
    await expect(page.getByText("No llegó ningún archivo.")).toHaveCount(0);
    await expect(grid.getByText("Portada")).toHaveCount(1);
    await expect(grid.getByText("2.ª vista")).toHaveCount(1);

    // La misma foto puede ir en varios lugares: la segunda como hero y como imagen final.
    await grid.locator("li button[aria-pressed]").nth(1).click();
    await page.getByTestId("assign-hero").click();
    await page.getByTestId("assign-band").click();
    await expect(grid.locator("li").nth(1)).toContainText("Hero");
    await expect(grid.locator("li").nth(1)).toContainText("Final");

    // Desde la casilla del uso también se elige la foto.
    await page.getByTestId("media-role-band").click();
    await grid.locator("li button[aria-pressed]").first().click();
    await expect(grid.locator("li").first()).toContainText("Final");
    await expect(grid.locator("li").nth(1)).not.toContainText("Final");
  });

  test("nuevo producto: primero la línea, luego la ficha de su plantilla", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
    await page.goto("/admin/catalogo/nuevo");
    await page.getByTestId("line-chooser").getByRole("link", { name: /Perfumería/ }).click();
    await expect(page).toHaveURL(/linea=perfumeria/);
    await expect(page.getByLabel("Notas de salida")).toBeVisible();
    await expect(page.getByLabel("Movimiento")).toHaveCount(0);
    await expect(page.locator("[data-testid=variants] li")).toHaveCount(2);

    await page.goto("/admin/catalogo?tab=lineas");
    await expect(page.getByRole("heading", { name: "Nueva línea" })).toBeVisible();
  });

  test("health expone estado y versión sin caché", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(await res.json()).toMatchObject({ status: "ok", db: "memoria" });
    const deep = await request.get("/api/health?deep=1");
    expect(await deep.json()).toMatchObject({ status: "ok", categories: 13 });
  });

  test("el webhook de Bold rechaza firmas inválidas", async ({ request }) => {
    const res = await request.post("/api/webhooks/bold", { data: { type: "SALE_APPROVED" }, headers: { "x-bold-signature": "nope" } });
    expect(res.status()).toBe(401);
  });
});
