import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Marca pedidos como pagados (descuenta stock): corre al final, en el proyecto "inicio".
// Los tests corren en paralelo sobre el mismo servidor: cada uno crea sus pedidos con
// un nombre único y filtra la lista por él, sin tocar los de los demás.

const unique = () => `Prueba ${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

async function createOrder(request: APIRequestContext, name = "Laura Gómez"): Promise<{ orderId: string; version: string }> {
  const terms = await (await request.get("/terminos")).text();
  const version = /Versión ([\d.]+)/.exec(terms)?.[1] ?? "1.0";
  const res = await request.post("/api/checkout", {
    data: {
      lines: [{ productId: "pf-02", variantId: "70-ml", quantity: 1 }],
      customer: { name, documentType: "CC", documentNumber: "52123456", email: "laura@example.com", phone: "3109876543", address: "Cra 7 # 72-10", city: "Bogotá", department: "Bogotá D.C." },
      consent: { accepted: true, termsVersion: version, privacyVersion: version },
    },
  });
  expect(res.status()).toBe(200);
  const { orderId } = (await res.json()) as { orderId: string };
  return { orderId, version };
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#password", E2E_ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/admin\/catalogo$/);
}

const acceptNextDialog = (page: Page) => page.once("dialog", (d) => void d.accept());
const row = (page: Page, id: string) => page.locator(`[data-testid=order-row][data-order="${id}"]`);

test.describe("Panel › Pedidos", () => {
  test("un pedido manual aparece con sus datos y al marcarlo pagado descuenta el stock", async ({ page, request }) => {
    const { orderId, version } = await createOrder(request);

    await login(page);
    await page.goto(`/admin/pedidos?estado=pendiente&q=${orderId}`);
    await page.getByRole("link", { name: orderId }).click();
    await expect(page.getByText("Laura Gómez")).toBeVisible();
    await expect(page.getByText("+57 310 987 6543")).toBeVisible();
    await expect(page.getByText(`Versión ${version}`).first()).toBeVisible();
    await expect(page.getByTestId("order-events")).toContainText("Pedido creado");

    acceptNextDialog(page);
    await page.getByTestId("order-mark-paid").click();
    await expect(page.getByText("Pedido · Pagado")).toBeVisible();
    await expect(page.getByTestId("order-actions")).toHaveCount(0);
    await expect(page.getByTestId("order-events")).toContainText("Pago confirmado");

    await page.goto(`/admin/pedidos?estado=pagada&q=${orderId}`);
    await expect(page.getByRole("link", { name: orderId })).toBeVisible();
    // Un pagado no se puede marcar para eliminar.
    await expect(page.getByLabel(`Marcar ${orderId}`)).toBeDisabled();
  });

  test("eliminar varios pendientes los lleva a Eliminados; desde ahí se restauran o se purgan", async ({ page, request }) => {
    const name = unique();
    const a = (await createOrder(request, name)).orderId;
    const b = (await createOrder(request, name)).orderId;

    await login(page);
    await page.goto("/admin/pedidos");
    await page.getByLabel("Buscar").fill(name);
    await page.getByTestId("orders-filter-submit").click();
    await expect(page).toHaveURL(/q=Prueba/);
    await expect(page.getByTestId("order-row")).toHaveCount(2);

    await page.getByLabel(`Marcar ${a}`).check();
    await page.getByLabel(`Marcar ${b}`).check();
    await expect(page.getByTestId("orders-bulk")).toContainText("2 seleccionados");
    acceptNextDialog(page);
    await page.getByTestId("orders-delete-selected").click();
    await expect(page.getByText("Ningún pedido coincide con los filtros.")).toBeVisible();

    await page.getByTestId("orders-trash-tab").click();
    await expect(page).toHaveURL(/vista=eliminados/);
    await expect(page.getByTestId("order-row")).toHaveCount(2);
    await expect(row(page, a)).toContainText("Se purga el");

    acceptNextDialog(page);
    await row(page, a).getByTestId("order-restore").click();
    await expect(row(page, a)).toHaveCount(0);
    acceptNextDialog(page);
    await row(page, b).getByTestId("order-purge").click();
    await expect(page.getByText("Ningún pedido coincide con los filtros.")).toBeVisible();

    expect((await page.request.get(`/admin/pedidos/${b}`)).status()).toBe(404);

    await page.goto(`/admin/pedidos?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId("order-row")).toHaveCount(1);
    await page.getByRole("link", { name: a }).click();
    await expect(page.getByTestId("order-events")).toContainText("Movido a Eliminados");
    await expect(page.getByTestId("order-events")).toContainText("Restaurado de Eliminados");
  });

  test("si llega el pago de un pedido eliminado, vuelve solo y queda marcado para revisar", async ({ page, request }) => {
    const name = unique();
    const { orderId } = await createOrder(request, name);

    await login(page);
    await page.goto(`/admin/pedidos/${orderId}`);
    acceptNextDialog(page);
    await page.getByTestId("order-delete").click();
    await expect(page.getByText("Pedido · Pendiente · Eliminado")).toBeVisible();
    await expect(page.getByTestId("order-trashed")).toBeVisible();

    // /gracias sigue encontrándolo.
    await page.goto(`/gracias?orden=${orderId}`);
    await expect(page.getByTestId("order-pendiente")).toBeVisible();

    // Bold en modo pruebas firma con llave vacía (ver webhookSecret).
    const body = JSON.stringify({ type: "SALE_APPROVED", data: { payment_id: "e2e", metadata: { reference: orderId } } });
    const signature = createHmac("sha256", "").update(Buffer.from(body).toString("base64")).digest("hex");
    const res = await request.post("/api/webhooks/bold", { data: body, headers: { "content-type": "application/json", "x-bold-signature": signature } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ handled: true, orderId, status: "pagada" });

    await page.goto(`/admin/pedidos?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId("orders-review-banner")).toBeVisible();
    await expect(row(page, orderId).getByTestId("order-review-badge")).toBeVisible();
    await expect(row(page, orderId)).toContainText("Pagado");

    await page.getByRole("link", { name: orderId }).click();
    await expect(page.getByTestId("order-review")).toContainText("Pago recibido de pedido eliminado — revisar");
    await expect(page.getByTestId("order-events")).toContainText("Pago recibido estando eliminado");
    await page.getByTestId("order-mark-reviewed").click();
    await expect(page.getByTestId("order-review")).toHaveCount(0);
    await expect(page.getByTestId("order-events")).toContainText("Marcado como revisado");
  });

  test("CSV de lo filtrado, con sesión verificada en el propio handler", async ({ page, request }) => {
    const name = unique();
    const { orderId } = await createOrder(request, name);

    await login(page);
    await page.goto(`/admin/pedidos?q=${encodeURIComponent(name)}&estado=pendiente`);
    await expect(page.getByTestId("orders-csv")).toHaveAttribute("href", /\/admin\/pedidos\/exportar\?estado=pendiente&q=Prueba/);
    const href = (await page.getByTestId("orders-csv").getAttribute("href"))!;
    const csv = await page.request.get(href);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(csv.headers()["content-disposition"]).toMatch(/attachment; filename="pedidos-/);
    const text = await csv.text();
    expect(text).toContain("Pedido;Fecha;Estado");
    expect(text.trimEnd().split("\r\n")).toHaveLength(2);
    expect(text).toContain(`${orderId};`);
    expect(text).toContain(name);

    // Rango de fechas sin pedidos: la lista queda vacía.
    await page.goto(`/admin/pedidos?q=${encodeURIComponent(name)}&desde=2000-01-01&hasta=2000-01-31`);
    await expect(page.getByText("Ningún pedido coincide con los filtros.")).toBeVisible();

    // Sin sesión: el middleware redirige y, si no corre (cabecera next-action), el handler responde 401.
    const anon = await request.get("/admin/pedidos/exportar", { maxRedirects: 0 });
    expect(anon.status()).toBe(307);
    const bypass = await request.get("/admin/pedidos/exportar", { headers: { "next-action": "x" }, maxRedirects: 0 });
    expect(bypass.status()).toBe(401);
  });

  test("Pedidos exige sesión", async ({ browser }) => {
    const anon = await browser.newContext();
    const page = await anon.newPage();
    await page.goto("/admin/pedidos");
    await expect(page).toHaveURL(/\/admin\/login/);
    await anon.close();
  });
});
