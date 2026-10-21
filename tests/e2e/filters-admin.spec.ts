import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Crea y borra un producto: corre en el proyecto "inicio", después del resto.
test.describe.configure({ mode: "serial" });

test("una pieza creada en el panel aparece en sus filtros y su precio entra en el rango", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("#password", E2E_ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin\/catalogo$/);

  await page.goto("/admin/catalogo/nuevo?linea=relojeria");
  // La marca se elige de la lista de Marcas; si no existe, se crea al vuelo.
  const picker = page.getByTestId("brand-picker");
  await picker.fill("Zenith");
  await page.getByTestId("brand-create").click();
  await expect(picker).toHaveValue("Zenith");
  await page.getByLabel("Modelo").fill("Chronomaster Sport");
  await page.getByLabel("Referencia").fill("03.3100.3600");
  await page.getByLabel("Subtítulo").fill("Cronógrafo · 41 mm");
  await page.getByLabel("Movimiento").fill("Automático · El Primero 3600");
  await page.getByLabel("Caja (mm)").fill("41");
  // El material para filtrar sigue al texto mientras no se elija a mano.
  await page.getByLabel("Material de la caja").fill("Cerámica negra");
  await expect(page.getByLabel("Material para filtrar")).toHaveValue("ceramica");
  await page.getByLabel("Precio en pesos").first().fill("777000000");
  await page.getByLabel("Unidades en stock").first().fill("1");
  await page.getByTestId("save-product").click();
  await expect(page).toHaveURL(/\/admin\/catalogo\/[^/?]+\?creado=1/, { timeout: 15_000 });
  const adminUrl = page.url().split("?")[0]!;

  await page.goto("/coleccion/relojeria");
  await page.getByTestId("filter-panel").locator("summary").click();
  await expect(page.getByTestId("facet-marca-zenith")).toBeVisible();
  await expect(page.getByTestId("facet-material-ceramica")).toBeVisible();
  await expect(page.getByTestId("price-range")).toContainText("$ 777.000.000 COP");

  // Rango libre: solo lo que cuesta 700 millones o más.
  await page.getByTestId("price-min").fill("700.000.000");
  await page.getByTestId("price-apply").click();
  await expect(page).toHaveURL(/precio_min=700/);
  await expect(page.locator("[data-testid=product-card]")).toHaveCount(1);
  await expect(page.locator("[data-testid=product-card] h3")).toHaveText("Chronomaster Sport");
  await expect(page.getByRole("group", { name: "Filtros activos" })).toContainText("Desde 700 millones");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Deja el catálogo como estaba.
  await page.goto(adminUrl);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Eliminar" }).first().click();
  await expect(page).toHaveURL(/\/admin\/catalogo$/);

  await page.goto("/coleccion/relojeria");
  await page.getByTestId("filter-panel").locator("summary").click();
  await expect(page.getByTestId("facet-marca-zenith")).toHaveCount(0);
});

test("en móvil el panel de filtros se cierra con «Ver piezas»", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/coleccion/perfumeria");
  const panel = page.getByTestId("filter-panel");
  await panel.locator("summary").click();
  await expect(panel.getByTestId("filters-done")).toBeVisible();
  await panel.getByTestId("facet-genero-femenino").click();
  await expect(page).toHaveURL(/genero=femenino/);
  await expect(panel.getByTestId("filters-clear")).toBeVisible();
  await panel.getByTestId("filters-done").click();
  await expect(panel).not.toHaveAttribute("open", "");
  await ctx.close();
});
