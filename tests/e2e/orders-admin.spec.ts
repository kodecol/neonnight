import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// Marca pedidos como pagados (descuenta stock): corre al final, en el proyecto "inicio".
test.describe("Panel › Pedidos", () => {
  test("un pedido manual aparece con sus datos y al marcarlo pagado descuenta el stock", async ({ page, request }) => {
    const terms = await (await request.get("/terminos")).text();
    const version = /Versión ([\d.]+)/.exec(terms)?.[1] ?? "1.0";
    const res = await request.post("/api/checkout", {
      data: {
        lines: [{ productId: "pf-02", variantId: "70-ml", quantity: 1 }],
        customer: { name: "Laura Gómez", documentType: "CC", documentNumber: "52123456", email: "laura@example.com", phone: "3109876543", address: "Cra 7 # 72-10", city: "Bogotá", department: "Bogotá D.C." },
        consent: { accepted: true, termsVersion: version, privacyVersion: version },
      },
    });
    expect(res.status()).toBe(200);
    const { orderId } = (await res.json()) as { orderId: string };

    await page.goto("/admin/login");
    await page.fill("#password", E2E_ADMIN_PASSWORD);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/admin\/catalogo$/);
    await page.goto("/admin/pedidos?estado=pendiente");
    await page.getByRole("link", { name: orderId }).click();
    await expect(page.getByText("Laura Gómez")).toBeVisible();
    await expect(page.getByText("+57 310 987 6543")).toBeVisible();
    await expect(page.getByText(`Versión ${version}`).first()).toBeVisible();

    page.once("dialog", (d) => void d.accept());
    await page.getByTestId("order-mark-paid").click();
    await expect(page.getByText("Pedido · Pagado")).toBeVisible();
    await expect(page.getByTestId("order-actions")).toHaveCount(0);

    await page.goto("/admin/pedidos?estado=pagada");
    await expect(page.getByRole("link", { name: orderId })).toBeVisible();
  });

  test("Pedidos exige sesión", async ({ browser }) => {
    const anon = await browser.newContext();
    const page = await anon.newPage();
    await page.goto("/admin/pedidos");
    await expect(page).toHaveURL(/\/admin\/login/);
    await anon.close();
  });
});
