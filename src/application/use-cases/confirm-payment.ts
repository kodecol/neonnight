import { z } from "zod";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { orderId, type Order } from "@/domain/entities/order";
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

    if (event.type === "SALE_REJECTED") {
      if (order.status !== "pendiente") return { handled: true, orderId: order.id, status: order.status };
      await this.deps.orders.save({ ...order, status: "fallida" });
      return { handled: true, orderId: order.id, status: "fallida" };
    }

    if (order.status === "pagada") return { handled: true, orderId: order.id, status: "pagada" };
    const paid = event.data?.amount?.total;
    if (paid !== undefined && paid !== order.total.units) return { handled: false, reason: `monto ${paid} ≠ ${order.total.units}` };

    await this.deps.orders.save({ ...order, status: "pagada" });
    const results = await Promise.all(order.lines.map((l) => this.deps.products.decrementStock(l.productId, l.variantId, l.quantity)));
    results.forEach((ok, i) => {
      if (!ok) console.warn(`[confirm-payment] stock insuficiente en ${order.lines[i]!.slug} (${order.id}): revisar a mano`);
    });
    return { handled: true, orderId: order.id, status: "pagada" };
  }
}
