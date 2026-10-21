import { orderId, type Order, type OrderStatus } from "@/domain/entities/order";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { FieldValidationError } from "../../lib/errors";
import { markOrderPaid } from "../confirm-payment";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = { pendiente: "Pendiente", pagada: "Pagado", fallida: "Pago rechazado", cancelada: "Cancelado" };

export interface AdminOrderRowDto {
  id: string;
  createdAt: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: Order["paymentMethod"];
  customer: string | null;
  city: string | null;
  items: number;
  total: string;
}

export interface AdminOrderDto extends AdminOrderRowDto {
  lines: Array<{ name: string; variantLabel: string; slug: string; quantity: number; unitPrice: string; lineTotal: string }>;
  subtotal: string;
  shipping: string;
  paymentReference: string | null;
  customerDetail: Order["customer"];
  consent: { termsVersion: string; privacyVersion: string; acceptedAt: string } | null;
  /** Acciones disponibles: solo los pedidos manuales se cambian a mano (Bold llega por webhook). */
  canMarkPaid: boolean;
  canCancel: boolean;
}

const row = (o: Order): AdminOrderRowDto => ({
  id: o.id,
  createdAt: o.createdAt.toISOString(),
  status: o.status,
  statusLabel: ORDER_STATUS_LABEL[o.status],
  paymentMethod: o.paymentMethod,
  customer: o.customer?.name ?? null,
  city: o.customer ? `${o.customer.city}, ${o.customer.department}` : null,
  items: o.lines.reduce((n, l) => n + l.quantity, 0),
  total: o.total.format(),
});

export class ListAdminOrders {
  constructor(private readonly orders: OrderRepository) {}

  async execute(status?: OrderStatus): Promise<AdminOrderRowDto[]> {
    return (await this.orders.list({ status, limit: 200 })).map(row);
  }
}

export class GetAdminOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(id: string): Promise<AdminOrderDto | null> {
    const o = await this.orders.findById(orderId(id));
    if (!o) return null;
    const subtotal = o.lines.reduce((acc, l) => acc.add(l.unitPrice.multiply(l.quantity)), o.total.multiply(0));
    return {
      ...row(o),
      lines: o.lines.map((l) => ({ name: l.name, variantLabel: l.variantLabel, slug: l.slug, quantity: l.quantity, unitPrice: l.unitPrice.format(), lineTotal: l.unitPrice.multiply(l.quantity).format() })),
      subtotal: subtotal.format(),
      shipping: o.shipping.cents === 0 ? "Sin costo" : o.shipping.format(),
      paymentReference: o.paymentReference,
      customerDetail: o.customer,
      consent: o.consent ? { ...o.consent, acceptedAt: o.consent.acceptedAt.toISOString() } : null,
      canMarkPaid: o.paymentMethod === "manual" && o.status === "pendiente",
      canCancel: o.status === "pendiente",
    };
  }
}

/**
 * Cambia a mano el estado de un pedido pendiente: "pagada" (solo pedidos
 * manuales; descuenta stock) o "cancelada". Devuelve las piezas que quedaron
 * sin stock suficiente, para revisarlas.
 */
export class UpdateOrderStatus {
  constructor(private readonly deps: { orders: OrderRepository; products: ProductRepository }) {}

  async execute(id: string, next: "pagada" | "cancelada"): Promise<{ short: string[] }> {
    const o = await this.deps.orders.findById(orderId(id));
    if (!o) throw new FieldValidationError("id", "El pedido no existe.");
    if (o.status !== "pendiente") throw new FieldValidationError("status", `El pedido ya está ${ORDER_STATUS_LABEL[o.status].toLowerCase()}.`);
    if (next === "pagada") {
      if (o.paymentMethod !== "manual") throw new FieldValidationError("status", "Los pagos con Bold se confirman solos por el webhook.");
      return { short: await markOrderPaid(o, this.deps) };
    }
    await this.deps.orders.save({ ...o, status: "cancelada" });
    return { short: [] };
  }
}
