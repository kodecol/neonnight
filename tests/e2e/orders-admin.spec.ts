import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Marca pedidos como pagados (descuenta stock): corre al final, en el proyecto "inicio".
// Los tests corren en paralelo sobre el mismo servidor: cada uno crea sus pedidos con
// un nombre único y filtra la lista por él, sin tocar los de los demás.

const unique = () => `Prueba ${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

async function createOrder(request: APIRequestContext, name = "Laura Gómez"): Promise<{ orderId: string; version: string }> {
  // legal-admin.spec publica versiones de los términos en paralelo: si la versión
  // leída quedó vieja (409 de consentimiento), se vuelve a leer y se reintenta.
  // Términos y privacidad llevan cada uno su versión (volver a fábrica sube la de términos).
  const versionOf = async (path: string) => /Versión ([\d.]+)/.exec(await (await request.get(path)).text())?.[1] ?? "1.0";
  for (let attempt = 0; ; attempt++) {
    const [version, privacyVersion] = await Promise.all([versionOf("/terminos"), versionOf("/privacidad")]);
    const res = await request.post("/api/checkout", {
      data: {
        lines: [{ productId: "pf-02", variantId: "70-ml", quantity: 1 }],
        customer: { name, documentType: "CC", documentNumber: "52123456", email: "laura@example.com", phone: "3109876543", address: "Cra 7 # 72-10", city: "Bogotá", department: "Bogotá D.C." },
        consent: { accepted: true, termsVersion: version, privacyVersion },
      },
    });
    const body = await res.text();
    if (res.status() === 409 && body.includes('"consent"') && attempt < 12) {
      await new Promise((r) => setTimeout(r, 300 + attempt * 200));
      continue;
    }
    expect(res.status(), body).toBe(200);
    const { orderId } = JSON.parse(body) as { orderId: string };
    return { orderId, version };
  }
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

  // El flujo "pago de un pedido eliminado → vuelve y queda para revisar" exige Bold activo
  // (pedidos de Bold); está cubierto en tests/unit/orders-admin.test.ts y payments.test.ts.
  test("con Bold apagado, un aviso de pago forjado con la llave vacía se rechaza y el pedido no cambia", async ({ page, request }) => {
    const name = unique();
    const { orderId } = await createOrder(request, name);

    for (const type of ["SALE_APPROVED", "SALE_REJECTED"]) {
      const body = JSON.stringify({ type, data: { payment_id: "e2e", metadata: { reference: orderId } } });
      const signature = createHmac("sha256", "").update(Buffer.from(body).toString("base64")).digest("hex");
      const res = await request.post("/api/webhooks/bold", { data: body, headers: { "content-type": "application/json", "x-bold-signature": signature } });
      expect(res.status()).toBe(401);
    }

    await page.goto(`/gracias?orden=${orderId}`);
    await expect(page.getByTestId("order-pendiente")).toBeVisible();
    await login(page);
    await page.goto(`/admin/pedidos?q=${encodeURIComponent(name)}`);
    await expect(row(page, orderId)).toContainText("Pendiente");
  });

  test("sin sesión, una navegación RSC con next-action no filtra el panel", async ({ request }) => {
    const name = unique();
    const { orderId } = await createOrder(request, name);
    // Árbol del router "ya en /admin/catalogo": pide solo el segmento de la página.
    const tree = encodeURIComponent(JSON.stringify(["", { children: ["admin", { children: ["(panel)", { children: ["catalogo", { children: ["__PAGE__", {}, null, null] }, null, null] }, null, null] }, null, null] }, null, null, true]));
    for (const path of ["/admin/pedidos", `/admin/pedidos/${orderId}`, "/admin/ajustes/pagos"]) {
      const res = await request.get(path, { headers: { RSC: "1", "next-action": "x", "Next-Router-State-Tree": tree, "Next-Url": "/admin/catalogo" }, maxRedirects: 0 });
      const body = await res.text();
      // El id puede aparecer como parámetro de la ruta; los datos del pedido, nunca.
      expect(body, path).toContain("NEXT_REDIRECT;replace;/admin/login");
      expect(body, path).not.toContain(name);
      expect(body, path).not.toContain("laura@example.com");
      expect(body, path).not.toContain("52123456");
    }
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
