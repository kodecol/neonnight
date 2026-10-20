import type { Order, OrderId } from "../entities/order";

export interface OrderRepository {
  /** Inserta o reemplaza por `id`. */
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByPaymentReference(reference: string): Promise<Order | null>;
}
