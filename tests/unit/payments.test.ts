import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { InMemoryOrderRepository } from "@/infrastructure/repositories/in-memory-order-repository";
import { InMemoryPaymentSettingsRepository } from "@/infrastructure/repositories/in-memory-payment-settings-repository";
import { NoopPaymentGateway } from "@/infrastructure/payments/noop-payment-gateway";
import { BoldGatewayError, BoldPaymentGateway } from "@/infrastructure/payments/bold-payment-gateway";
import { boldWebhookSignature, verifyBoldWebhook } from "@/infrastructure/payments/bold-signature";
import { SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import { ConfirmPayment } from "@/application/use-cases/confirm-payment";
import { orderId, type Order } from "@/domain/entities/order";
import { productId } from "@/domain/entities/product";
import { productStatus } from "@/domain/services/availability";
import { Money } from "@/domain/value-objects/money";
import { DEFAULT_PAYMENT_SETTINGS, webhookSecret } from "@/application/ports/payment-settings";
import { UpdateOrderStatus } from "@/application/use-cases/admin/orders";
import { REVIEW_PAID_AFTER_CANCEL } from "@/domain/entities/order";

const order = (over: Partial<Order> = {}): Order => ({
  id: orderId("nn-abc12345"),
  lines: [{ productId: productId("w-03"), variantId: "unica", variantLabel: "", slug: "tudor", name: "Tudor Black Bay 58", unitPrice: Money.fromUnits(16_900_000), quantity: 1 }],
  total: Money.fromUnits(16_900_000),
  status: "pendiente",
  createdAt: new Date("2026-10-03T00:00:00Z"),
  paymentReference: "LNK_TEST",
  shipping: Money.zero(),
  paymentMethod: "bold",
  customer: null,
  consent: null,
  deletedAt: null,
  events: [],
  review: null,
  ...over,
});

describe("Firma de webhooks de Bold", () => {
  const body = JSON.stringify({ type: "SALE_APPROVED", data: { metadata: { reference: "nn-abc12345" } } });

  it("es HMAC-SHA256 hex del cuerpo en Base64", () => {
    const expected = createHmac("sha256", "sk").update(Buffer.from(body).toString("base64")).digest("hex");
    expect(boldWebhookSignature(body, "sk")).toBe(expected);
    expect(verifyBoldWebhook(body, expected, "sk")).toBe(true);
  });

  it("rechaza firmas ausentes, alteradas o con otra llave; en pruebas la llave es vacía", () => {
    const sig = boldWebhookSignature(body, "");
    expect(verifyBoldWebhook(body, sig, "")).toBe(true);
    expect(verifyBoldWebhook(body, null, "")).toBe(false);
    expect(verifyBoldWebhook(`${body} `, sig, "")).toBe(false);
    expect(verifyBoldWebhook(body, sig, "otra")).toBe(false);
  });
});

describe("ConfirmPayment", () => {
  const setup = (o = order()) => {
    const orders = new InMemoryOrderRepository();
    const products = new InMemoryProductRepository(SEED_PRODUCTS);
    void orders.save(o);
    return { orders, products, uc: new ConfirmPayment({ orders, products, clock: { now: () => new Date() } }) };
  };
  const event = (type: string, reference = "nn-abc12345", total = 16_900_000) => ({ type, data: { payment_id: "p1", amount: { total }, metadata: { reference } } });

  it("aprobada: orden pagada y pieza vendida; idempotente", async () => {
    const { uc, orders, products } = setup();
    expect(await uc.execute(event("SALE_APPROVED"))).toEqual({ handled: true, orderId: "nn-abc12345", status: "pagada" });
    expect((await orders.findById(orderId("nn-abc12345")))?.status).toBe("pagada");
    const sold = (await products.findById("w-03"))!;
    expect(sold.variants[0]?.stock).toBe(0);
    expect(productStatus(sold, "pieza")).toBe("vendido");
    expect(await uc.execute(event("SALE_APPROVED"))).toMatchObject({ handled: true, status: "pagada" });
    expect((await products.findById("w-03"))?.variants[0]?.stock).toBe(0);
  });

  it("aprobada: descuenta unidades de la presentación vendida", async () => {
    const line = { productId: productId("pf-01"), variantId: "100-ml", variantLabel: "100 ml", slug: "creed-aventus", name: "Creed Aventus", unitPrice: Money.fromUnits(2_390_000), quantity: 2 };
    const { uc, products } = setup(order({ lines: [line], total: Money.fromUnits(4_780_000) }));
    await uc.execute(event("SALE_APPROVED", "nn-abc12345", 4_780_000));
    const p = (await products.findById("pf-01"))!;
    expect(p.variants.map((v) => [v.id, v.stock])).toEqual([
      ["50-ml", 4],
      ["100-ml", 1],
    ]);
    expect(productStatus(p, "unidades")).toBe("disponible");
  });

  it("rechazada: orden fallida, la pieza sigue disponible", async () => {
    const { uc, orders, products } = setup();
    await uc.execute(event("SALE_REJECTED"));
    expect((await orders.findById(orderId("nn-abc12345")))?.status).toBe("fallida");
    expect((await products.findById("w-03"))?.variants[0]?.stock).toBe(1);
  });

  it("encuentra la orden por referencia de pago y descarta montos distintos o eventos ajenos", async () => {
    const { uc } = setup();
    expect(await uc.execute(event("SALE_APPROVED", "nn-abc12345", 1))).toMatchObject({ handled: false });
    expect(await uc.execute(event("VOID_APPROVED"))).toMatchObject({ handled: false });
    expect(await uc.execute(event("SALE_APPROVED", "nadie"))).toMatchObject({ handled: false });
    expect(await uc.execute({ basura: true })).toMatchObject({ handled: false });
    expect(await uc.execute(event("SALE_APPROVED", "LNK_TEST"))).toMatchObject({ handled: true, status: "pagada" });
  });
});

describe("Webhook de Bold: endurecimiento", () => {
  const setup = (o = order()) => {
    const orders = new InMemoryOrderRepository();
    const products = new InMemoryProductRepository(SEED_PRODUCTS);
    void orders.save(o);
    const clock = { now: () => new Date() };
    return { orders, products, uc: new ConfirmPayment({ orders, products, clock }), admin: new UpdateOrderStatus({ orders, products, clock }) };
  };
  const approved = (reference = "nn-abc12345", total = 16_900_000) => ({ type: "SALE_APPROVED", data: { payment_id: "p1", amount: { total }, metadata: { reference } } });

  it("sin Bold activo no se acepta ninguna firma (tampoco la de llave vacía)", () => {
    expect(webhookSecret(DEFAULT_PAYMENT_SETTINGS)).toBeNull();
    expect(webhookSecret({ ...DEFAULT_PAYMENT_SETTINGS, mode: "produccion", enabled: true, identityKey: "pk", secretKey: "" })).toBeNull();
    expect(webhookSecret({ ...DEFAULT_PAYMENT_SETTINGS, enabled: true, identityKey: "pk" })).toBe("");
    expect(webhookSecret({ ...DEFAULT_PAYMENT_SETTINGS, mode: "produccion", enabled: true, identityKey: "pk", secretKey: "sk" })).toBe("sk");
  });

  it("un pedido manual no cambia con avisos de Bold", async () => {
    const { uc, orders, products } = setup(order({ paymentMethod: "manual" }));
    expect(await uc.execute(approved())).toMatchObject({ handled: false });
    expect(await uc.execute({ type: "SALE_REJECTED", data: { metadata: { reference: "nn-abc12345" } } })).toMatchObject({ handled: false });
    expect((await orders.findById(orderId("nn-abc12345")))?.status).toBe("pendiente");
    expect((await products.findById("w-03"))?.variants[0]?.stock).toBe(1);
  });

  it("avisos repetidos a la vez descuentan el stock una sola vez", async () => {
    const line = { productId: productId("pf-01"), variantId: "100-ml", variantLabel: "100 ml", slug: "creed-aventus", name: "Creed Aventus", unitPrice: Money.fromUnits(2_390_000), quantity: 2 };
    const { uc, products, orders } = setup(order({ lines: [line], total: Money.fromUnits(4_780_000) }));
    await Promise.all(Array.from({ length: 5 }, () => uc.execute(approved("nn-abc12345", 4_780_000))));
    expect((await products.findById("pf-01"))?.variants.find((v) => v.id === "100-ml")?.stock).toBe(1);
    expect((await orders.findById(orderId("nn-abc12345")))?.events.filter((e) => e.type === "pagado")).toHaveLength(1);
  });

  it("pago tras cancelar: queda pagado y marcado para revisar; el panel no pisa un pago que llegó", async () => {
    const { uc, orders, admin } = setup();
    await admin.execute("nn-abc12345", "cancelada");
    await uc.execute(approved());
    const o = await orders.findById(orderId("nn-abc12345"));
    expect(o).toMatchObject({ status: "pagada", review: REVIEW_PAID_AFTER_CANCEL });

    // El panel cargó el pedido pendiente antes de que llegara el pago: su cancelación ya no aplica.
    const race = setup();
    const stale = (await race.orders.findById(orderId("nn-abc12345")))!;
    await race.uc.execute(approved());
    expect(await race.orders.transition({ ...stale, status: "cancelada" }, ["pendiente"])).toBe(false);
    expect((await race.orders.findById(orderId("nn-abc12345")))?.status).toBe("pagada");
  });

  it("sin stock suficiente al pagar: queda marcado para revisar", async () => {
    const { uc, orders, products } = setup();
    await products.decrementStock(productId("w-03"), "unica", 1);
    await uc.execute(approved());
    expect((await orders.findById(orderId("nn-abc12345")))?.review).toMatch(/Stock insuficiente/);
  });
});

describe("BoldPaymentGateway", () => {
  it("sin Bold activo delega en el flujo sin cobro", async () => {
    const fetchImpl = vi.fn();
    const gw = new BoldPaymentGateway(new InMemoryPaymentSettingsRepository(), new NoopPaymentGateway(), fetchImpl);
    const s = await gw.createSession(order(), "http://x.test/gracias");
    expect(s.redirectUrl).toBe("http://x.test/gracias?orden=nn-abc12345");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("activo: crea un link cerrado por el total y redirige a Bold", async () => {
    const settings = new InMemoryPaymentSettingsRepository({ enabled: true, mode: "pruebas", identityKey: "pk_test", secretKey: "", manual: DEFAULT_PAYMENT_SETTINGS.manual, updatedAt: null });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ payload: { payment_link: "LNK_1", url: "https://checkout.bold.co/LNK_1" }, errors: [] }), { status: 200 }));
    const gw = new BoldPaymentGateway(settings, new NoopPaymentGateway(), fetchImpl as unknown as typeof fetch, () => 1_000);
    const s = await gw.createSession(order(), "https://neonnight.co/gracias");

    expect(s).toEqual({ reference: "LNK_1", redirectUrl: "https://checkout.bold.co/LNK_1", status: "pendiente" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://integrations.api.bold.co/online/link/v1");
    expect((init.headers as Record<string, string>).Authorization).toBe("x-api-key pk_test");
    const sent = JSON.parse(String(init.body));
    expect(sent).toMatchObject({
      amount_type: "CLOSE",
      amount: { currency: "COP", total_amount: 16_900_000 },
      reference: "nn-abc12345",
      callback_url: "https://neonnight.co/gracias?orden=nn-abc12345",
      expiration_date: (1_000 + 30 * 60 * 1000) * 1_000_000,
    });
  });

  it("omite callback no HTTPS y propaga errores de Bold", async () => {
    const settings = new InMemoryPaymentSettingsRepository({ enabled: true, mode: "pruebas", identityKey: "pk", secretKey: "", manual: DEFAULT_PAYMENT_SETTINGS.manual, updatedAt: null });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: "bad" }] }), { status: 400 }));
    const gw = new BoldPaymentGateway(settings, new NoopPaymentGateway(), fetchImpl as unknown as typeof fetch);
    await expect(gw.createSession(order(), "http://localhost:3000/gracias")).rejects.toBeInstanceOf(BoldGatewayError);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).callback_url).toBeUndefined();
  });
});
