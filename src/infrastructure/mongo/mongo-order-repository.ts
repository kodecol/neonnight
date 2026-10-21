import type { Filter } from "mongodb";
import {
  orderId,
  trashCutoff,
  type Order,
  type OrderConsent,
  type OrderCustomer,
  type OrderEventActor,
  type OrderEventType,
  type OrderId,
  type OrderStatus,
  type PaymentMethod,
} from "@/domain/entities/order";
import { productId } from "@/domain/entities/product";
import type { OrderQuery, OrderRepository } from "@/domain/repositories/order-repository";
import { orderSearchPatterns } from "@/domain/services/order-search";
import { Money } from "@/domain/value-objects/money";
import type { DbProvider } from "./client";

interface OrderDoc {
  _id: string;
  /** Las órdenes de la v1 traen `watchId` y ninguna variante. */
  lines: Array<{ productId?: string; watchId?: string; variantId?: string; variantLabel?: string; slug: string; name: string; unitPriceCents: number; quantity: number }>;
  totalCents: number;
  /** Las órdenes anteriores al checkout con datos no traen envío, comprador ni consentimiento. */
  shippingCents?: number;
  currency: "COP";
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  paymentReference: string | null;
  paymentMethod?: PaymentMethod;
  customer?: OrderCustomer | null;
  consent?: OrderConsent | null;
  /** Papelera, auditoría y marca de revisión: los pedidos anteriores no los traen (activos, sin historial). */
  deletedAt?: Date | null;
  events?: Array<{ at: Date; type: OrderEventType; by: OrderEventActor; note?: string }>;
  review?: string | null;
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
  shippingCents: o.shipping.cents,
  currency: o.total.currency,
  status: o.status,
  createdAt: o.createdAt,
  updatedAt: new Date(),
  paymentReference: o.paymentReference,
  paymentMethod: o.paymentMethod,
  customer: o.customer,
  consent: o.consent,
  deletedAt: o.deletedAt,
  // Sin `note: undefined`: el driver lo guardaría como null.
  events: o.events.map((e) => ({ at: e.at, type: e.type, by: e.by, ...(e.note ? { note: e.note } : {}) })),
  review: o.review,
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
  shipping: Money.fromCents(d.shippingCents ?? 0, d.currency),
  status: d.status,
  createdAt: d.createdAt,
  paymentReference: d.paymentReference,
  paymentMethod: d.paymentMethod ?? "bold",
  customer: d.customer ?? null,
  consent: d.consent ?? null,
  deletedAt: d.deletedAt ?? null,
  events: (d.events ?? []).map((e) => ({ at: e.at, type: e.type, by: e.by, ...(e.note ? { note: e.note } : {}) })),
  review: d.review ?? null,
});

const regex = (source: string) => ({ $regex: source, $options: "i" });

/** `deletedAt: null` también encuentra los documentos sin el campo (anteriores a la papelera). */
function filterOf(q: OrderQuery): Filter<OrderDoc> {
  const f: Filter<OrderDoc> = q.deleted ? { deletedAt: { $ne: null } } : { deletedAt: null };
  if (q.status) f.status = q.status;
  if (q.review) f.review = { $ne: null };
  if (q.from || q.to) f.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  const p = q.search ? orderSearchPatterns(q.search) : null;
  if (p) {
    f.$or = [
      { _id: regex(p.text) },
      { "customer.name": regex(p.text) },
      { "customer.email": regex(p.text) },
      { "customer.phone": regex(p.text) },
      ...(p.phone ? [{ "customer.phone": { $regex: p.phone } }] : []),
    ] as Filter<OrderDoc>[];
  }
  return f;
}

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

  async list(q: OrderQuery & { limit?: number; offset?: number } = {}): Promise<readonly Order[]> {
    const docs = await (await this.col())
      .find(filterOf(q))
      .sort(q.deleted ? { deletedAt: -1, createdAt: -1 } : { createdAt: -1 })
      .skip(q.offset ?? 0)
      .limit(q.limit ?? 0)
      .toArray();
    return docs.map(fromDoc);
  }

  async count(q: OrderQuery = {}): Promise<number> {
    return (await this.col()).countDocuments(filterOf(q));
  }

  async remove(id: OrderId): Promise<void> {
    await (await this.col()).deleteOne({ _id: id });
  }

  async purgeExpired(now: Date): Promise<number> {
    const res = await (await this.col()).deleteMany({ deletedAt: { $lt: trashCutoff(now) } });
    return res.deletedCount;
  }
}
