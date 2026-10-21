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
    await expect(page.getByText("Publicado en la home")).toBeVisible();
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
    await expect(page.getByText("Publicado en la home")).toBeVisible();
    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("site-media-remove").click();
    await expect(page.getByTestId("site-media-grid").locator("button[aria-pressed]")).toHaveCount(0);

    await page.goto("/");
    await expect(page.locator("#hero-title")).not.toHaveText("Prueba de portada");
  });

  test("compromisos, testimonios y redes se editan y se reflejan en la home y el pie de página", async ({ page }) => {
    await page.goto("/admin/inicio");
    const trust = page.getByTestId("trust-editor");
    const firstTitle = trust.getByLabel("Título").first();
    const original = await firstTitle.inputValue();
    await firstTitle.fill("Verificado de verdad");

    // Testimonios: la plantilla no trae; uno nuevo solo se publica autorizado.
    const items = page.getByTestId("testimonial");
    for (const name of ["Andrea P.", "Bruno L."]) {
      await page.getByRole("button", { name: /Añadir testimonio/ }).click();
      const t = items.last();
      await t.getByLabel("Testimonio", { exact: true }).fill("Me mostraron la pieza por video antes de pagar y llegó tal cual.");
      await t.getByLabel("Nombre", { exact: true }).fill(name);
      await t.getByLabel("Ciudad", { exact: true }).fill("Bogotá");
      await t.getByLabel("Pieza", { exact: true }).fill("Reloj de prueba");
      await expect(t).toContainText("Falta autorización");
      await t.getByRole("switch", { name: "Autorizado por el cliente" }).click();
      await expect(t).toContainText("Publicado");
    }

    await page.getByTestId("network-facebook").getByRole("switch").click();
    await page.getByTestId("save-home").click();
    await expect(page.getByText("Publicado en la home")).toBeVisible();

    await page.goto("/");
    await expect(page.locator("#autenticidad")).toContainText("Verificado de verdad");
    // En móvil, los botones para elegir testimonio miden al menos 24 × 24 px (axe target-size).
    await page.setViewportSize({ width: 390, height: 844 });
    const sizes = await page.getByRole("group", { name: "Elegir testimonio" }).locator("button").evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)));
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(24);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId("social-links").locator("a")).toHaveCount(2);
    await expect(page.getByTestId("site-footer").getByRole("link", { name: "Facebook" })).toHaveCount(0);
    await expect(page.getByTestId("site-footer").getByRole("link", { name: "Instagram" }).first()).toBeVisible();

    // Deja la home como estaba para el resto de pruebas.
    await page.goto("/admin/inicio");
    await page.getByTestId("trust-editor").getByLabel("Título").first().fill(original);
    for (let i = 0; i < 2; i++) await page.getByTestId("testimonial").last().getByRole("button", { name: /Quitar|Eliminar/ }).click();
    await page.getByTestId("network-facebook").getByRole("switch").click();
    await page.getByTestId("save-home").click();
    await expect(page.getByText("Publicado en la home")).toBeVisible();
  });

  test("vista previa del borrador, orden de bloques y versiones", async ({ page, context }) => {
    await page.goto("/admin/inicio");
    // Oculta los métodos de pago y sube "Garantía" al primer lugar (la plantilla no trae testimonios).
    const layout = page.getByTestId("home-layout");
    await layout.getByTestId("block-pagos").getByRole("switch").click();
    const garantia = layout.getByTestId("block-garantia");
    for (let i = 0; i < 4; i++) await garantia.getByRole("button", { name: /Subir/ }).click();
    await expect(layout.locator("li").first()).toContainText("Garantía");

    // Vista previa: se abre en otra pestaña con el borrador; la tienda sigue igual.
    const [preview] = await Promise.all([context.waitForEvent("page"), page.getByTestId("preview-home").click()]);
    await preview.waitForURL(/\/admin\/vista-previa/);
    await expect(preview.getByTestId("preview-banner")).toBeVisible();
    await expect(preview.locator("#autenticidad")).toBeVisible();
    const order = await preview.locator("main > section").evaluateAll((els) => els.map((e) => e.id || e.getAttribute("aria-labelledby") || ""));
    expect(order.indexOf("autenticidad")).toBe(1);
    await expect(preview.getByText("Paga como prefieras")).toHaveCount(0);
    await preview.close();

    await page.goto("/");
    await expect(page.getByText("Paga como prefieras")).toBeVisible();

    // Publicar lleva el borrador a la tienda.
    await page.goto("/admin/inicio");
    await expect(page.getByText("Borrador sin publicar", { exact: true })).toBeVisible();
    await page.getByTestId("save-home").click();
    await expect(page.getByText("Publicado en la home")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("Paga como prefieras")).toHaveCount(0);

    // Volver a la versión anterior desde el historial.
    await page.goto("/admin/inicio");
    await page.getByTestId("home-versions").getByRole("button", { name: "Cargar en el editor" }).first().click();
    await expect(page.getByTestId("home-layout").locator("li").first()).toContainText("Marcas");
    await page.getByTestId("save-home").click();
    await expect(page.getByText("Publicado en la home")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("Paga como prefieras")).toBeVisible();
  });

  test("la vista previa exige sesión del panel", async ({ browser }) => {
    const anon = await browser.newContext();
    const page = await anon.newPage();
    await page.goto("/admin/vista-previa");
    await expect(page).toHaveURL(/\/admin\/login/);
    await anon.close();
  });
});
