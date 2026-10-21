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

  test("checkout: datos del comprador, aceptación legal y pedido manual sin pasarela", async ({ page }) => {
    await page.goto("/reloj/rolex-cosmograph-daytona-126500ln");
    await page.locator("[data-testid=add-rolex-cosmograph-daytona-126500ln]").click();
    await page.locator("[data-testid=checkout-button]").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId("checkout-total")).toHaveText(/\$ [\d.]+ COP/);
    await expect(page.getByTestId("checkout-summary")).toContainText("Sin costo");

    // Sin aceptar los términos no avanza.
    const form = page.getByTestId("checkout-form");
    await form.getByLabel("Nombre completo").fill("Ana Pérez");
    await form.getByLabel("Número de documento").fill("1020304050");
    await form.getByLabel("Correo").fill("ana@example.com");
    await form.getByLabel("Celular").fill("300 123 4567");
    await form.getByLabel("Dirección").fill("Calle 93 # 11-20");
    await form.getByLabel("Ciudad o municipio").fill("Bogotá");
    await form.getByLabel("Departamento").selectOption("Bogotá D.C.");
    await page.getByTestId("checkout-submit").click();
    await expect(page.getByText("Debes aceptar los términos y la política de privacidad.")).toBeVisible();

    // Un dato inválido vuelve marcado desde el servidor.
    await form.getByLabel("Celular").fill("12345");
    await page.getByTestId("checkout-consent").locator("input").check();
    await page.getByTestId("checkout-submit").click();
    await expect(page.getByText(/celular colombiano/)).toBeVisible();

    await form.getByLabel("Celular").fill("300 123 4567");
    await page.getByTestId("checkout-submit").click();
    await expect(page).toHaveURL(/\/gracias\?orden=NN-\d{6}-[A-Z0-9]{5}$/);
    await expect(page.getByTestId("order-pendiente")).toBeVisible();
    await expect(page.getByTestId("order-whatsapp")).toHaveAttribute("href", /wa\.me\/573000000000\?text=.*NN-/);
    await expect(page.locator("[data-testid=cart-count]")).toHaveText("0");
  });

  test("el checkout rechaza importes manipulados, piezas inexistentes y datos incompletos", async ({ request }) => {
    const customer = { name: "Ana Pérez", documentType: "CC", documentNumber: "1020304050", email: "ana@example.com", phone: "3001234567", address: "Calle 93 # 11-20", city: "Bogotá", department: "Bogotá D.C." };
    const legal = await (await request.get("/terminos")).text();
    const version = /Versión ([\d.]+)/.exec(legal)?.[1] ?? "1.0";
    const consent = { accepted: true, termsVersion: version, privacyVersion: version };
    const ok = await request.post("/api/checkout", { data: { lines: [{ productId: "w-03", quantity: 1 }], expectedTotalCents: 1, customer, consent } });
    expect(ok.status()).toBe(200);
    const body = (await ok.json()) as { total: { cents: number }; priceChanged: boolean; paymentMethod: string };
    expect(body.total.cents).toBe(16_900_000 * 100);
    expect(body.priceChanged).toBe(true);
    expect(body.paymentMethod).toBe("manual");

    const bad = await request.post("/api/checkout", { data: { lines: [{ productId: "nope", quantity: 1 }], customer, consent } });
    expect(bad.status()).toBe(409);
    const invalid = await request.post("/api/checkout", { data: { lines: [] } });
    expect(invalid.status()).toBe(400);
    const noConsent = await request.post("/api/checkout", { data: { lines: [{ productId: "w-03", quantity: 1 }], customer, consent: { ...consent, accepted: false } } });
    expect(noConsent.status()).toBe(400);
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
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId("checkout-total")).toHaveText("$ 4.080.000 COP");
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

  test("el botón fijo de WhatsApp lleva modelo, referencia y URL canónica en la ficha", async ({ page }) => {
    await page.goto("/reloj/rolex-sky-dweller-326938");
    // El mensaje de la pieza se fija al hidratar la ficha.
    await expect(page.locator("[data-testid=whatsapp-fab]")).toHaveAttribute("href", /326938/);
    const href = await page.locator("[data-testid=whatsapp-fab]").getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/573000000000\?text=/);
    const text = decodeURIComponent(href!.split("text=")[1]!);
    expect(text).toContain("Rolex Sky-Dweller");
    expect(text).toContain("326938");
    expect(text).toContain("/reloj/rolex-sky-dweller-326938");
  });
});
