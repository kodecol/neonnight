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

  all(): readonly Order[] {
    return [...this.orders.values()];
  }
}
