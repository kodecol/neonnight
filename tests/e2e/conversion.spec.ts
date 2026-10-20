import { expect, test } from "@playwright/test";

test.describe("Caminos de conversión", () => {
  test("añadir a la bolsa abre el drawer, actualiza el contador y persiste", async ({ page }) => {
    await page.goto("/reloj/rolex-sky-dweller-326938");
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("0");
    await page.locator("[data-testid=add-rolex-sky-dweller-326938]").click();
    await expect(page.locator("#cart-drawer")).toBeVisible();
    await expect(page.locator("[data-testid=cart-lines] li")).toHaveCount(1);
    await expect(page.locator("[data-testid=cart-total]")).toHaveText("$ 168.000.000 COP");
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("1");

    // Piezas únicas: no duplica ni deja subir la cantidad
    await page.keyboard.press("Escape");
    await expect(page.locator("#cart-drawer")).toBeHidden();
    await page.locator("[data-testid=add-rolex-sky-dweller-326938]").click();
    await expect(page.locator("[data-testid=cart-lines] li")).toHaveCount(1);

    await page.reload();
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("1");
  });

  test("checkout recalcula en el servidor y redirige a gracias", async ({ page }) => {
    await page.goto("/reloj/rolex-cosmograph-daytona-126500ln");
    await page.locator("[data-testid=add-rolex-cosmograph-daytona-126500ln]").click();
    await page.locator("[data-testid=checkout-button]").click();
    await expect(page).toHaveURL(/\/gracias\?orden=nn-/);
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("0");
  });

  test("el checkout rechaza importes manipulados y piezas inexistentes", async ({ request }) => {
    const ok = await request.post("/api/checkout", { data: { lines: [{ productId: "w-03", quantity: 1 }], expectedTotalCents: 1 } });
    expect(ok.status()).toBe(200);
    const body = (await ok.json()) as { total: { cents: number }; priceChanged: boolean };
    expect(body.total.cents).toBe(16_900_000 * 100);
    expect(body.priceChanged).toBe(true);

    const bad = await request.post("/api/checkout", { data: { lines: [{ productId: "nope", quantity: 1 }] } });
    expect(bad.status()).toBe(409);
    const invalid = await request.post("/api/checkout", { data: { lines: [] } });
    expect(invalid.status()).toBe(400);
  });

  test("perfume: elegir presentación y cantidad, y la bolsa suma por unidades", async ({ page }) => {
    await page.goto("/perfume/creed-aventus");
    const picker = page.getByTestId("variant-picker");
    await picker.getByRole("button", { name: /100 ml/ }).click();
    await page.getByRole("group", { name: "Cantidad" }).getByRole("button", { name: "Añadir una unidad" }).click();
    await page.locator("[data-testid=add-creed-aventus]").click();
    await expect(page.locator("#cart-drawer")).toBeVisible();
    await expect(page.locator("[data-testid=cart-total]")).toHaveText("$ 4.080.000 COP");
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("2");
    await page.locator("[data-testid=checkout-button]").click();
    await expect(page).toHaveURL(/\/gracias\?orden=nn-/);
  });

  test("colección: líneas, filtros por URL y orden", async ({ page }) => {
    await page.goto("/coleccion");
    await expect(page.getByTestId("line-tabs").getByRole("link")).toHaveCount(4);
    await page.getByTestId("line-tabs").getByRole("link", { name: /Joyería/ }).click();
    await expect(page).toHaveURL(/\/coleccion\/joyeria$/);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(8);

    await page.getByTestId("filter-panel").locator("summary").click();
    await page.getByTestId("facet-metal-oro-rosa").click();
    await expect(page).toHaveURL(/metal=oro-rosa/);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(2);

    await page.goto("/coleccion?categoria=gmt");
    await expect(page).toHaveURL(/\/coleccion\/relojeria\?categoria=gmt$/);
    await expect(page.locator("[data-testid=product-card]")).toHaveCount(2);
  });

  test("el enlace de WhatsApp lleva modelo, referencia y URL canónica", async ({ page }) => {
    await page.goto("/reloj/rolex-sky-dweller-326938");
    const href = await page.locator("[data-testid=whatsapp-cta]").getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/573000000000\?text=/);
    const text = decodeURIComponent(href!.split("text=")[1]!);
    expect(text).toContain("Rolex Sky-Dweller");
    expect(text).toContain("326938");
    expect(text).toContain("/reloj/rolex-sky-dweller-326938");
  });
});
