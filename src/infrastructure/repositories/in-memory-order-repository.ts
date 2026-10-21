import type { Order, OrderId } from "@/domain/entities/order";
import type { OrderRepository } from "@/domain/repositories/order-repository";

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(id: OrderId): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByPaymentReference(reference: string): Promise<Order | null> {
    return [...this.orders.values()].find((o) => o.paymentReference === reference) ?? null;
  }

  async list(opts: { status?: Order["status"]; limit?: number } = {}): Promise<readonly Order[]> {
    return [...this.orders.values()]
      .filter((o) => !opts.status || o.status === opts.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, opts.limit ?? 200);
  }

  all(): readonly Order[] {
    return [...this.orders.values()];
  }
}
