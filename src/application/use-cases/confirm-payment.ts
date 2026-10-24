import { z } from "zod";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { REVIEW_PAID_AFTER_CANCEL, REVIEW_PAID_AFTER_DELETE, orderId, reviewShortStock, withEvents, type Order, type OrderEventActor } from "@/domain/entities/order";
import type { Clock } from "../ports/clock";
import type { PaymentGateway } from "../ports/payment-gateway";

/** Subconjunto del evento de webhook de Bold que nos interesa. */
const BoldEventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      payment_id: z.string().optional(),
      amount: z.object({ total: z.number().optional() }).optional(),
      metadata: z.object({ reference: z.string().nullish() }).optional(),
    })
    .optional(),
});

export type ConfirmPaymentResult =
  | { handled: true; orderId: string; status: Order["status"] }
  | { handled: false; reason: string };

/**
 * Aplica una notificación de la pasarela a la orden. Idempotente: Bold
 * reintenta hasta 5 veces y puede repetir eventos.
 * Aprobada → orden `pagada` y stock descontado por variante (una pieza única
 * queda en 0 y se lee "Vendido"). Rechazada → `fallida`.
 * Un pedido en la papelera se sigue encontrando: si llega el pago, se restaura,
 * se cobra como cualquier otro y queda marcado para revisar.
 */
export class ConfirmPayment {
  constructor(private readonly deps: { orders: OrderRepository; products: ProductRepository; clock: Clock }) {}

  async execute(raw: unknown): Promise<ConfirmPaymentResult> {
    const parsed = BoldEventSchema.safeParse(raw);
    if (!parsed.success) return { handled: false, reason: "evento inválido" };
    const event = parsed.data;
    if (event.type !== "SALE_APPROVED" && event.type !== "SALE_REJECTED") return { handled: false, reason: `evento ignorado: ${event.type}` };

    const reference = event.data?.metadata?.reference;
    if (!reference) return { handled: false, reason: "sin referencia" };
    const order = (await this.deps.orders.findById(orderId(reference))) ?? (await this.deps.orders.findByPaymentReference(reference));
    if (!order) return { handled: false, reason: `orden desconocida: ${reference}` };
    // Un pedido manual nunca pasó por Bold: ningún aviso de Bold lo cambia.
    if (order.paymentMethod !== "bold") return { handled: false, reason: `pedido ${order.id} no es de Bold` };

    return applyGatewayResult(order, event.type === "SALE_APPROVED" ? "pagada" : "fallida", event.data?.amount?.total ?? null, this.deps, "webhook");
  }
}

/**
 * Si el webhook de Bold no llega (mal configurado, caído, firma rechazada), el
 * pedido quedaría pendiente aunque el cliente pagó. Esto le pregunta a Bold el
 * estado del link y aplica el resultado igual que el webhook. Lo usan la
 * página de gracias (mientras está pendiente) y el panel (botón "Verificar").
 */
export class ReconcilePayment {
  constructor(private readonly deps: { orders: OrderRepository; products: ProductRepository; clock: Clock; payments: PaymentGateway }) {}

  async execute(id: string): Promise<ConfirmPaymentResult & { gateway?: "pendiente" | "pagada" | "fallida" }> {
    const order = await this.deps.orders.findById(orderId(id));
    if (!order) return { handled: false, reason: `orden desconocida: ${id}` };
    if (order.paymentMethod !== "bold" || !order.paymentReference) return { handled: false, reason: `pedido ${order.id} no es de Bold` };
    if (order.status === "pagada") return { handled: true, orderId: order.id, status: "pagada" };
    const found = await this.deps.payments.lookup(order.paymentReference);
    if (!found) return { handled: false, reason: "Bold no respondió" };
    if (found.status === "pendiente") return { handled: true, orderId: order.id, status: order.status, gateway: "pendiente" };
    // Solo un pendiente pasa a rechazado; un pago aprobado sí corrige un cancelado (queda para revisar).
    if (found.status === "fallida" && order.status !== "pendiente") return { handled: true, orderId: order.id, status: order.status, gateway: "fallida" };
    const result = await applyGatewayResult(order, found.status, found.totalUnits, this.deps, "verificacion", found.detail ?? undefined);
    return { ...result, gateway: found.status };
  }
}

/** Aplica aprobado/rechazado a la orden. Idempotente y atómico (ver `transition`). */
async function applyGatewayResult(
  order: Order,
  outcome: "pagada" | "fallida",
  paidUnits: number | null,
  deps: { orders: OrderRepository; products: ProductRepository; clock: Clock },
  by: OrderEventActor,
  note?: string,
): Promise<ConfirmPaymentResult> {
  const at = deps.clock.now();
  if (outcome === "fallida") {
    if (order.status !== "pendiente") return { handled: true, orderId: order.id, status: order.status };
    // Un eliminado sigue en la papelera: solo cambia el estado.
    const won = await deps.orders.transition(withEvents({ ...order, status: "fallida" }, { at, type: "fallido", by, ...(note ? { note } : {}) }), ["pendiente"]);
    return { handled: true, orderId: order.id, status: won ? "fallida" : order.status };
  }

  if (order.status === "pagada") return { handled: true, orderId: order.id, status: "pagada" };
  if (paidUnits !== null && paidUnits !== order.total.units) return { handled: false, reason: `monto ${paidUnits} ≠ ${order.total.units}` };

  let restored = order.deletedAt
    ? withEvents({ ...order, deletedAt: null, review: REVIEW_PAID_AFTER_DELETE }, { at, type: "pago-tras-eliminar", by, note: "Volvió de Eliminados al recibir el pago." })
    : order;
  if (order.deletedAt) console.warn(`[pedido] pago recibido de un pedido eliminado (${order.id}): restaurado, revisar`);
  if (order.status === "cancelada") restored = { ...restored, review: REVIEW_PAID_AFTER_CANCEL };
  await markOrderPaid(restored, deps, by, at, note);
  return { handled: true, orderId: order.id, status: "pagada" };
}

/**
 * Marca la orden como pagada (con su evento) y descuenta el stock de cada
 * variante (una pieza única queda en 0 y se lee "Vendido"). Lo usan el webhook
 * de Bold, la verificación con Bold y el panel. Devuelve las piezas sin stock
 * suficiente para revisar a mano.
 */
export async function markOrderPaid(order: Order, deps: { orders: OrderRepository; products: ProductRepository }, by: OrderEventActor, at: Date, note?: string): Promise<string[]> {
  // Atómico: si dos avisos llegan a la vez, solo el que gana descuenta stock.
  const paid = withEvents({ ...order, status: "pagada" as const }, { at, type: "pagado", by, ...(note ? { note } : {}) });
  if (!(await deps.orders.transition(paid, [order.status]))) return [];
  const results = await Promise.all(order.lines.map((l) => deps.products.decrementStock(l.productId, l.variantId, l.quantity)));
  const short = order.lines.filter((_, i) => !results[i]).map((l) => l.slug);
  if (short.length) {
    console.warn(`[pedido] stock insuficiente en ${short.join(", ")} (${order.id}): revisar a mano`);
    await deps.orders.transition({ ...paid, review: paid.review ?? reviewShortStock(short) }, ["pagada"]);
  }
  return short;
}
