import { expect, test } from "@playwright/test";

test.describe("Caminos de conversión", () => {
  test("añadir a la bolsa abre el drawer, actualiza el contador y persiste", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("0");
    await page.locator("[data-testid=add-rolex-day-date-36]").click();
    await expect(page.locator("#cart-drawer")).toBeVisible();
    await expect(page.locator("[data-testid=cart-lines] li")).toHaveCount(1);
    await expect(page.locator("[data-testid=cart-total]")).toHaveText("$ 12.900.000 COP");
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("1");

    // Piezas únicas: no duplica
    await page.keyboard.press("Escape");
    await expect(page.locator("#cart-drawer")).toBeHidden();
    await page.locator("[data-testid=add-rolex-day-date-36]").click();
    await expect(page.locator("[data-testid=cart-lines] li")).toHaveCount(1);

    await page.reload();
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("1");
  });

  test("checkout recalcula en el servidor y redirige a gracias", async ({ page }) => {
    await page.goto("/reloj/modelo-02");
    await page.locator("[data-testid=add-modelo-02]").click();
    await page.locator("[data-testid=checkout-button]").click();
    await expect(page).toHaveURL(/\/gracias\?orden=nn-/);
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("0");
  });

  test("el checkout rechaza importes manipulados y piezas inexistentes", async ({ request }) => {
    const ok = await request.post("/api/checkout", { data: { lines: [{ watchId: "w-03", quantity: 1 }], expectedTotalCents: 1 } });
    expect(ok.status()).toBe(200);
    const body = (await ok.json()) as { total: { cents: number }; priceChanged: boolean };
    expect(body.total.cents).toBe(18_600_000 * 100);
    expect(body.priceChanged).toBe(true);

    const bad = await request.post("/api/checkout", { data: { lines: [{ watchId: "nope", quantity: 1 }] } });
    expect(bad.status()).toBe(409);
    const invalid = await request.post("/api/checkout", { data: { lines: [] } });
    expect(invalid.status()).toBe(400);
  });

  test("el enlace de WhatsApp lleva modelo, referencia y URL canónica", async ({ page }) => {
    await page.goto("/reloj/rolex-day-date-36");
    const href = await page.locator("[data-testid=whatsapp-cta]").getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/573000000000\?text=/);
    const text = decodeURIComponent(href!.split("text=")[1]!);
    expect(text).toContain("Rolex Day-Date 36");
    expect(text).toContain("128238");
    expect(text).toContain("/reloj/rolex-day-date-36");
  });
});
