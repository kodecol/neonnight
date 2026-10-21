import { describe, expect, it } from "vitest";
import { InMemoryOrderRepository } from "@/infrastructure/repositories/in-memory-order-repository";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import {
  DeleteOrders,
  ExportOrdersCsv,
  GetAdminOrder,
  ListAdminOrders,
  MarkOrderReviewed,
  PurgeOrder,
  RestoreOrder,
  UpdateOrderStatus,
  orderFiltersQuery,
  parseAdminOrderFilters,
} from "@/application/use-cases/admin/orders";
import { ConfirmPayment } from "@/application/use-cases/confirm-payment";
import { GetOrderStatus } from "@/application/use-cases/get-order-status";
import { REVIEW_PAID_AFTER_DELETE, orderId, paymentLinkMayBeLive, type Order } from "@/domain/entities/order";
import { productId } from "@/domain/entities/product";
import { OrderNotDeletableError, OrderNotInTrashError } from "@/domain/errors";
import { Money } from "@/domain/value-objects/money";
import { deleteOrdersQuestion } from "@/presentation/lib/order-confirm";

const NOW = new Date("2026-10-20T15:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const clockAt = (d: Date) => ({ now: () => d });
const clock = clockAt(NOW);

const order = (id: string, over: Partial<Order> = {}): Order => ({
  id: orderId(id),
  lines: [{ productId: productId("pf-02"), variantId: "70-ml", variantLabel: "70 ml", slug: "creed-aventus", name: "Creed Aventus", unitPrice: Money.fromUnits(1_440_000), quantity: 1 }],
  total: Money.fromUnits(1_440_000),
  shipping: Money.zero(),
  status: "pendiente",
  createdAt: new Date(NOW.getTime() - 2 * DAY),
  paymentReference: null,
  paymentMethod: "manual",
  customer: {
    name: "Laura Gómez",
    documentType: "CC",
    documentNumber: "52123456",
    email: "laura@example.com",
    phone: "+57 310 987 6543",
    address: "Cra 7 # 72-10",
    city: "Bogotá",
    department: "Bogotá D.C.",
    notes: "",
  },
  consent: null,
  deletedAt: null,
  events: [{ at: new Date(NOW.getTime() - 2 * DAY), type: "creado", by: "cliente" }],
  review: null,
  ...over,
});

const setup = (...seed: Order[]) => {
  const orders = new InMemoryOrderRepository();
  seed.forEach((o) => void orders.save(o));
  const products = new InMemoryProductRepository(SEED_PRODUCTS);
  return { orders, products, deps: { orders, products, clock } };
};
const all = parseAdminOrderFilters({});
const get = (orders: InMemoryOrderRepository, id: string) => orders.findById(orderId(id));

describe("Pedidos › eliminar (papelera)", () => {
  it("solo elimina pendientes, valida en el servidor y no toca nada si uno falla", async () => {
    const { orders, deps } = setup(order("NN-1"), order("NN-2", { status: "pagada" }), order("NN-3", { status: "cancelada" }));
    await expect(new DeleteOrders(deps).execute(["NN-1", "NN-2"])).rejects.toBeInstanceOf(OrderNotDeletableError);
    expect((await get(orders, "NN-1"))?.deletedAt).toBeNull();
    await expect(new DeleteOrders(deps).execute(["NN-3"])).rejects.toThrow(/cancelado/);
    await expect(new DeleteOrders(deps).execute([])).rejects.toThrow();
    await expect(new DeleteOrders(deps).execute("NN-1")).rejects.toThrow();

    expect(await new DeleteOrders(deps).execute(["NN-1", "NN-1"])).toEqual({ deleted: ["NN-1"] });
    const deleted = await get(orders, "NN-1");
    expect(deleted?.deletedAt).toEqual(NOW);
    expect(deleted?.events.at(-1)).toEqual({ at: NOW, type: "eliminado", by: "admin" });
    await expect(new DeleteOrders(deps).execute(["NN-1"])).rejects.toThrow(/ya está en Eliminados/);
  });

  it("los eliminados salen de la lista y de los conteos, pero /gracias y el webhook los encuentran", async () => {
    const { orders, deps } = setup(order("NN-1"), order("NN-2"));
    await new DeleteOrders(deps).execute(["NN-1"]);
    const list = await new ListAdminOrders(deps).execute(all);
    expect(list.rows.map((r) => r.id)).toEqual(["NN-2"]);
    expect(list).toMatchObject({ total: 1, trashCount: 1 });
    expect(await orders.count({ status: "pendiente" })).toBe(1);

    const trash = await new ListAdminOrders(deps).execute(parseAdminOrderFilters({ vista: "eliminados" }));
    expect(trash.rows.map((r) => r.id)).toEqual(["NN-1"]);
    expect(trash.rows[0]).toMatchObject({ canDelete: false, deletedAt: NOW.toISOString(), purgeAt: new Date(NOW.getTime() + 30 * DAY).toISOString() });

    expect((await new GetOrderStatus(orders).execute("NN-1"))?.status).toBe("pendiente");
    expect(await new GetAdminOrder(deps).execute("NN-1")).toMatchObject({ canRestore: true, canMarkPaid: false, canCancel: false, canDelete: false });
    await expect(new UpdateOrderStatus(deps).execute("NN-1", "pagada")).rejects.toThrow(/Eliminados/);
  });

  it("restaurar lo devuelve tal como estaba, con su evento", async () => {
    const { orders, deps } = setup(order("NN-1"));
    await expect(new RestoreOrder(deps).execute("NN-1")).rejects.toBeInstanceOf(OrderNotInTrashError);
    await new DeleteOrders(deps).execute(["NN-1"]);
    await new RestoreOrder(deps).execute("NN-1");
    const o = await get(orders, "NN-1");
    expect(o).toMatchObject({ deletedAt: null, status: "pendiente" });
    expect(o?.events.map((e) => e.type)).toEqual(["creado", "eliminado", "restaurado"]);
    expect((await new ListAdminOrders(deps).execute(all)).rows.map((r) => r.id)).toEqual(["NN-1"]);
  });

  it("purgar solo desde la papelera", async () => {
    const { orders, deps } = setup(order("NN-1"));
    await expect(new PurgeOrder(orders).execute("NN-1")).rejects.toBeInstanceOf(OrderNotInTrashError);
    await new DeleteOrders(deps).execute(["NN-1"]);
    await new PurgeOrder(orders).execute("NN-1");
    expect(await get(orders, "NN-1")).toBeNull();
    await expect(new PurgeOrder(orders).execute("NN-1")).rejects.toThrow(/no existe/);
  });

  it("al listar se purgan los que llevan más de 30 días en la papelera", async () => {
    const { orders } = setup(
      order("NN-VIEJO", { deletedAt: new Date(NOW.getTime() - 31 * DAY) }),
      order("NN-JUSTO", { deletedAt: new Date(NOW.getTime() - 30 * DAY + 60_000) }),
      order("NN-ACTIVO", { createdAt: new Date(NOW.getTime() - 90 * DAY) }),
    );
    const list = await new ListAdminOrders({ orders, clock }).execute(parseAdminOrderFilters({ vista: "eliminados" }));
    expect(list.rows.map((r) => r.id)).toEqual(["NN-JUSTO"]);
    expect(await get(orders, "NN-VIEJO")).toBeNull();
    expect(await get(orders, "NN-ACTIVO")).not.toBeNull();
    expect(await orders.purgeExpired(new Date(NOW.getTime() + 2 * 60_000))).toBe(1);
    expect(await get(orders, "NN-JUSTO")).toBeNull();
  });

  it("avisa si el link de Bold puede seguir vigente (menos de 30 min y con referencia)", () => {
    const bold = { paymentMethod: "bold" as const, paymentReference: "LNK_1" };
    expect(paymentLinkMayBeLive(order("a", { ...bold, createdAt: new Date(NOW.getTime() - 10 * 60_000) }), NOW)).toBe(true);
    expect(paymentLinkMayBeLive(order("b", { ...bold, createdAt: new Date(NOW.getTime() - 31 * 60_000) }), NOW)).toBe(false);
    expect(paymentLinkMayBeLive(order("c", { ...bold, paymentReference: null, createdAt: NOW }), NOW)).toBe(false);
    expect(paymentLinkMayBeLive(order("d", { createdAt: NOW }), NOW)).toBe(false);
    expect(deleteOrdersQuestion([{ id: "NN-1", linkMayBeLive: true }])).toMatch(/NN-1 tiene un link de pago de Bold que puede seguir vigente/);
    expect(deleteOrdersQuestion([{ id: "NN-1", linkMayBeLive: false }, { id: "NN-2", linkMayBeLive: false }])).not.toMatch(/Ojo/);
  });
});

describe("Pedidos › webhook sobre un eliminado", () => {
  const approved = (reference: string) => ({ type: "SALE_APPROVED", data: { payment_id: "p1", amount: { total: 1_440_000 }, metadata: { reference } } });

  it("lo restaura, cobra normal (descuenta stock) y lo marca para revisar", async () => {
    const { orders, products, deps } = setup(order("NN-1", { paymentMethod: "bold", paymentReference: "LNK_1" }));
    await new DeleteOrders(deps).execute(["NN-1"]);
    const before = (await products.findById("pf-02"))!.variants.find((v) => v.id === "70-ml")!.stock;

    expect(await new ConfirmPayment(deps).execute(approved("NN-1"))).toEqual({ handled: true, orderId: "NN-1", status: "pagada" });
    const o = await get(orders, "NN-1");
    expect(o).toMatchObject({ status: "pagada", deletedAt: null, review: REVIEW_PAID_AFTER_DELETE });
    expect(o?.events.map((e) => [e.type, e.by])).toEqual([
      ["creado", "cliente"],
      ["eliminado", "admin"],
      ["pago-tras-eliminar", "webhook"],
      ["pagado", "webhook"],
    ]);
    expect((await products.findById("pf-02"))!.variants.find((v) => v.id === "70-ml")!.stock).toBe(before - 1);

    const list = await new ListAdminOrders(deps).execute(all);
    expect(list).toMatchObject({ reviewCount: 1, trashCount: 0 });
    expect(list.rows[0]).toMatchObject({ id: "NN-1", review: REVIEW_PAID_AFTER_DELETE });
    expect((await new ListAdminOrders(deps).execute(parseAdminOrderFilters({ revisar: "1" }))).rows.map((r) => r.id)).toEqual(["NN-1"]);

    // Idempotente: Bold reintenta.
    await new ConfirmPayment(deps).execute(approved("NN-1"));
    expect((await get(orders, "NN-1"))?.events).toHaveLength(4);

    await new MarkOrderReviewed(deps).execute("NN-1");
    const reviewed = await get(orders, "NN-1");
    expect(reviewed?.review).toBeNull();
    expect(reviewed?.events.at(-1)).toMatchObject({ type: "revisado", by: "admin", note: REVIEW_PAID_AFTER_DELETE });
    expect((await new ListAdminOrders(deps).execute(all)).reviewCount).toBe(0);
  });

  it("lo encuentra también por la referencia del link; rechazado queda fallido y sigue en la papelera", async () => {
    const { orders, deps } = setup(order("NN-1", { paymentMethod: "bold", paymentReference: "LNK_1" }), order("NN-2", { paymentMethod: "bold", paymentReference: "LNK_2" }));
    await new DeleteOrders(deps).execute(["NN-1", "NN-2"]);
    expect(await new ConfirmPayment(deps).execute(approved("LNK_1"))).toMatchObject({ handled: true, status: "pagada" });
    expect(await new ConfirmPayment(deps).execute({ type: "SALE_REJECTED", data: { metadata: { reference: "NN-2" } } })).toMatchObject({ handled: true, status: "fallida" });
    const rejected = await get(orders, "NN-2");
    expect(rejected).toMatchObject({ status: "fallida", review: null });
    expect(rejected?.deletedAt).not.toBeNull();
    expect(rejected?.events.at(-1)).toMatchObject({ type: "fallido", by: "webhook" });
  });

  it("los cambios del panel y del webhook también quedan en el historial", async () => {
    const { orders, deps } = setup(order("NN-1"), order("NN-2", { paymentMethod: "bold", paymentReference: "LNK_2" }));
    await new UpdateOrderStatus(deps).execute("NN-1", "cancelada");
    expect((await get(orders, "NN-1"))?.events.at(-1)).toEqual({ at: NOW, type: "cancelado", by: "admin" });
    await new ConfirmPayment(deps).execute(approved("NN-2"));
    expect((await get(orders, "NN-2"))?.events.at(-1)).toEqual({ at: NOW, type: "pagado", by: "webhook" });
    const detail = await new GetAdminOrder(deps).execute("NN-2");
    expect(detail?.events.map((e) => `${e.label} · ${e.by}`)).toEqual(["Pedido creado · Cliente", "Pago confirmado · Bold (webhook)"]);
  });
});

describe("Pedidos › lista, filtros y CSV", () => {
  it("busca por id, nombre (sin tildes), correo o celular (por dígitos)", async () => {
    const { deps } = setup(
      order("NN-260101-AAAAA"),
      order("NN-260101-BBBBB", { customer: { ...order("x").customer!, name: "Óscar Peña", email: "oscar@correo.co", phone: "+57 300 111 2233" } }),
    );
    const ids = async (q: string) => (await new ListAdminOrders(deps).execute(parseAdminOrderFilters({ q }))).rows.map((r) => r.id);
    expect(await ids("bbbbb")).toEqual(["NN-260101-BBBBB"]);
    expect(await ids("oscar pena")).toEqual(["NN-260101-BBBBB"]);
    expect(await ids("GÓMEZ")).toEqual(["NN-260101-AAAAA"]);
    expect(await ids("oscar@correo")).toEqual(["NN-260101-BBBBB"]);
    expect(await ids("3001112233")).toEqual(["NN-260101-BBBBB"]);
    expect(await ids("310 987")).toEqual(["NN-260101-AAAAA"]);
    expect(await ids("(.*)")).toEqual([]);
  });

  it("filtra por rango de fechas en hora de Bogotá, ambos días inclusive", async () => {
    const { deps } = setup(
      order("NN-A", { createdAt: new Date("2026-10-10T04:59:00Z") }), // 9 oct, 23:59 en Bogotá
      order("NN-B", { createdAt: new Date("2026-10-10T05:00:00Z") }), // 10 oct, 00:00
      order("NN-C", { createdAt: new Date("2026-10-12T04:59:00Z") }), // 11 oct, 23:59
      order("NN-D", { createdAt: new Date("2026-10-12T05:00:00Z") }), // 12 oct
    );
    const ids = async (sp: Record<string, string>) => (await new ListAdminOrders(deps).execute(parseAdminOrderFilters(sp))).rows.map((r) => r.id);
    expect(await ids({ desde: "2026-10-10", hasta: "2026-10-11" })).toEqual(["NN-C", "NN-B"]);
    expect(await ids({ desde: "2026-10-12" })).toEqual(["NN-D"]);
    expect(await ids({ hasta: "2026-10-09" })).toEqual(["NN-A"]);
    expect(await ids({ desde: "10/10/2026" })).toHaveLength(4);
  });

  it("pagina de a 25 y no se pasa de la última página", async () => {
    const seed = Array.from({ length: 30 }, (_, i) => order(`NN-${String(i).padStart(2, "0")}`, { createdAt: new Date(NOW.getTime() - i * 60_000) }));
    const { deps } = setup(...seed);
    const p1 = await new ListAdminOrders(deps).execute(all);
    expect(p1).toMatchObject({ total: 30, page: 1, pages: 2 });
    expect(p1.rows).toHaveLength(25);
    expect(p1.rows[0]!.id).toBe("NN-00");
    const p2 = await new ListAdminOrders(deps).execute(parseAdminOrderFilters({ pagina: "9" }));
    expect(p2).toMatchObject({ page: 2 });
    expect(p2.rows.map((r) => r.id)).toEqual(["NN-25", "NN-26", "NN-27", "NN-28", "NN-29"]);
  });

  it("lee los filtros de la URL y los vuelve a escribir", () => {
    expect(parseAdminOrderFilters({ estado: "nada", pagina: "-3", desde: "2026-02-31x" })).toEqual({ status: null, trash: false, review: false, q: "", from: null, to: null, page: 1 });
    const f = parseAdminOrderFilters({ estado: "pagada", q: "  ana ", desde: "2026-10-01", pagina: "2" });
    expect(orderFiltersQuery(f)).toBe("?estado=pagada&q=ana&desde=2026-10-01&pagina=2");
    expect(orderFiltersQuery(f, { page: 1, trash: true, status: null })).toBe("?vista=eliminados&q=ana&desde=2026-10-01");
  });

  it("CSV de lo filtrado: BOM, punto y coma, comillas y sin fórmulas", async () => {
    const { orders } = setup(
      order("NN-1", { customer: { ...order("x").customer!, name: '=HYPERLINK("x")', notes: "" }, review: REVIEW_PAID_AFTER_DELETE }),
      order("NN-2", { status: "pagada" }),
      order("NN-3", { deletedAt: NOW }),
    );
    const csv = await new ExportOrdersCsv(orders).execute(parseAdminOrderFilters({ estado: "pendiente" }));
    expect(csv.startsWith("﻿Pedido;Fecha;Estado;")).toBe(true);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`NN-1;${new Date(NOW.getTime() - 2 * DAY - 5 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ")};Pendiente;Manual;"'=HYPERLINK(""x"")"`);
    expect(lines[1]).toContain("'+57 310 987 6543");
    expect(lines[1]).toContain("Creed Aventus (70 ml) ×1;1;1440000;");
    expect(lines[1]).toContain(REVIEW_PAID_AFTER_DELETE);
    const trash = await new ExportOrdersCsv(orders).execute(parseAdminOrderFilters({ vista: "eliminados" }));
    expect(trash).toContain("NN-3");
    expect(trash).not.toContain("NN-1;");
  });
});

describe("Pedidos: endurecimiento (QA nocturno)", () => {
  it("filtros: estados heredados del prototipo y caracteres de control no rompen la lista", () => {
    for (const estado of ["constructor", "__proto__", "toString"]) expect(parseAdminOrderFilters({ estado }).status).toBeNull();
    expect(parseAdminOrderFilters({ q: "lau\u0000ra\u001f" }).q).toBe("laura");
  });

  it("las actions validan el id: un objeto (operador de Mongo) no llega al repositorio", async () => {
    const { deps } = setup(order("nn-1"));
    await expect(new RestoreOrder(deps).execute({ $regex: "^nn" } as unknown as string)).rejects.toThrow(/no existe/);
    await expect(new UpdateOrderStatus(deps).execute("nn-1", "cualquier-cosa" as "pagada")).rejects.toThrow(/no válido/);
  });

  it("no se purga un pedido de Bold cuyo link puede seguir vigente", async () => {
    const recent = order("nn-bold", { paymentMethod: "bold", paymentReference: "LNK_1", createdAt: new Date(Date.now() - 5 * 60_000), deletedAt: new Date() });
    const { orders } = setup(recent);
    await expect(new PurgeOrder(orders).execute("nn-bold")).rejects.toThrow(/vigente/);
    expect(await get(orders, "nn-bold")).not.toBeNull();
  });
});
