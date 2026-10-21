import { trashCutoff, type Order, type OrderId } from "@/domain/entities/order";
import type { OrderQuery, OrderRepository } from "@/domain/repositories/order-repository";
import { matchesOrderSearch } from "@/domain/services/order-search";

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async transition(next: Order, from: readonly Order["status"][]): Promise<boolean> {
    const current = this.orders.get(next.id);
    if (!current || !from.includes(current.status)) return false;
    this.orders.set(next.id, next);
    return true;
  }

  async findById(id: OrderId): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByPaymentReference(reference: string): Promise<Order | null> {
    return [...this.orders.values()].find((o) => o.paymentReference === reference) ?? null;
  }

  private filter(q: OrderQuery): Order[] {
    return [...this.orders.values()].filter(
      (o) =>
        (q.deleted ? o.deletedAt !== null : o.deletedAt === null) &&
        (!q.status || o.status === q.status) &&
        (!q.review || o.review !== null) &&
        (!q.from || o.createdAt >= q.from) &&
        (!q.to || o.createdAt < q.to) &&
        (!q.search || matchesOrderSearch(o, q.search)),
    );
  }

  async list(q: OrderQuery & { limit?: number; offset?: number } = {}): Promise<readonly Order[]> {
    const time = (o: Order) => (q.deleted ? (o.deletedAt ?? o.createdAt) : o.createdAt).getTime();
    const offset = q.offset ?? 0;
    return this.filter(q)
      .sort((a, b) => time(b) - time(a))
      .slice(offset, q.limit === undefined ? undefined : offset + q.limit);
  }

  async count(q: OrderQuery = {}): Promise<number> {
    return this.filter(q).length;
  }

  async remove(id: OrderId): Promise<void> {
    this.orders.delete(id);
  }

  async purgeExpired(now: Date): Promise<number> {
    const cutoff = trashCutoff(now);
    const expired = [...this.orders.values()].filter((o) => o.deletedAt !== null && o.deletedAt < cutoff);
    expired.forEach((o) => this.orders.delete(o.id));
    return expired.length;
  }

  all(): readonly Order[] {
    return [...this.orders.values()];
  }
}
