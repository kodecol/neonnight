import { z } from "zod";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { REVIEW_PAID_AFTER_DELETE, orderId, withEvents, type Order, type OrderEventActor } from "@/domain/entities/order";
import type { Clock } from "../ports/clock";

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

    const at = this.deps.clock.now();
    if (event.type === "SALE_REJECTED") {
      if (order.status !== "pendiente") return { handled: true, orderId: order.id, status: order.status };
      // Un eliminado sigue en la papelera: solo cambia el estado.
      await this.deps.orders.save(withEvents({ ...order, status: "fallida" }, { at, type: "fallido", by: "webhook" }));
      return { handled: true, orderId: order.id, status: "fallida" };
    }

    if (order.status === "pagada") return { handled: true, orderId: order.id, status: "pagada" };
    const paid = event.data?.amount?.total;
    if (paid !== undefined && paid !== order.total.units) return { handled: false, reason: `monto ${paid} ≠ ${order.total.units}` };

    const restored = order.deletedAt
      ? withEvents({ ...order, deletedAt: null, review: REVIEW_PAID_AFTER_DELETE }, { at, type: "pago-tras-eliminar", by: "webhook", note: "Volvió de Eliminados al recibir el pago." })
      : order;
    if (order.deletedAt) console.warn(`[pedido] pago recibido de un pedido eliminado (${order.id}): restaurado, revisar`);
    await markOrderPaid(restored, this.deps, "webhook", at);
    return { handled: true, orderId: order.id, status: "pagada" };
  }
}

/**
 * Marca la orden como pagada (con su evento) y descuenta el stock de cada
 * variante (una pieza única queda en 0 y se lee "Vendido"). Lo usan el webhook
 * de Bold y el panel (pedidos manuales). Devuelve las piezas sin stock
 * suficiente para revisar a mano.
 */
export async function markOrderPaid(order: Order, deps: { orders: OrderRepository; products: ProductRepository }, by: OrderEventActor, at: Date): Promise<string[]> {
  await deps.orders.save(withEvents({ ...order, status: "pagada" }, { at, type: "pagado", by }));
  const results = await Promise.all(order.lines.map((l) => deps.products.decrementStock(l.productId, l.variantId, l.quantity)));
  const short = order.lines.filter((_, i) => !results[i]).map((l) => l.slug);
  short.forEach((slug) => console.warn(`[pedido] stock insuficiente en ${slug} (${order.id}): revisar a mano`));
  return short;
}
