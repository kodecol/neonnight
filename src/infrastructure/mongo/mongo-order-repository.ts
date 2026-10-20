import { orderId, type Order, type OrderId, type OrderStatus } from "@/domain/entities/order";
import { productId } from "@/domain/entities/product";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import { Money } from "@/domain/value-objects/money";
import type { DbProvider } from "./client";

interface OrderDoc {
  _id: string;
  /** Las órdenes de la v1 traen `watchId` y ninguna variante. */
  lines: Array<{ productId?: string; watchId?: string; variantId?: string; variantLabel?: string; slug: string; name: string; unitPriceCents: number; quantity: number }>;
  totalCents: number;
  currency: "COP";
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  paymentReference: string | null;
}

const toDoc = (o: Order): OrderDoc => ({
  _id: o.id,
  lines: o.lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    variantLabel: l.variantLabel,
    slug: l.slug,
    name: l.name,
    unitPriceCents: l.unitPrice.cents,
    quantity: l.quantity,
  })),
  totalCents: o.total.cents,
  currency: o.total.currency,
  status: o.status,
  createdAt: o.createdAt,
  updatedAt: new Date(),
  paymentReference: o.paymentReference,
});

const fromDoc = (d: OrderDoc): Order => ({
  id: orderId(d._id),
  lines: d.lines.map((l) => ({
    productId: productId(l.productId ?? l.watchId ?? ""),
    variantId: l.variantId ?? "unica",
    variantLabel: l.variantLabel ?? "",
    slug: l.slug,
    name: l.name,
    unitPrice: Money.fromCents(l.unitPriceCents, d.currency),
    quantity: l.quantity,
  })),
  total: Money.fromCents(d.totalCents, d.currency),
  status: d.status,
  createdAt: d.createdAt,
  paymentReference: d.paymentReference,
});

export class MongoOrderRepository implements OrderRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<OrderDoc>("orders");
  }

  async save(order: Order): Promise<void> {
    await (await this.col()).replaceOne({ _id: order.id }, toDoc(order), { upsert: true });
  }

  async findById(id: OrderId): Promise<Order | null> {
    const d = await (await this.col()).findOne({ _id: id });
    return d ? fromDoc(d) : null;
  }

  async findByPaymentReference(reference: string): Promise<Order | null> {
    const d = await (await this.col()).findOne({ paymentReference: reference });
    return d ? fromDoc(d) : null;
  }
}
