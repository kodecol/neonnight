import type { OrderRepository } from "@/domain/repositories/order-repository";
import { orderId } from "@/domain/entities/order";
import type { OrderStatusDto } from "../dto/admin.dto";

export class GetOrderStatus {
  constructor(private readonly orders: OrderRepository) {}

  async execute(id: string): Promise<OrderStatusDto | null> {
    const order = await this.orders.findById(orderId(id));
    return order ? { id: order.id, status: order.status, totalFormatted: order.total.format() } : null;
  }
}
