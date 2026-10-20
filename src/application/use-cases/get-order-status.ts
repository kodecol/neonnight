import type { OrderRepository } from "@/domain/repositories/order-repository";
import { orderId } from "@/domain/entities/order";
import type { OrderStatusDto } from "../dto/admin.dto";

export class GetOrderStatus {
  constructor(private readonly orders: OrderRepository) {}

  async execute(id: string): Promise<OrderStatusDto | null> {
    const order = await this.orders.findById(orderId(id));
    if (!order) return null;
    return {
      id: order.id,
      status: order.status,
      totalFormatted: order.total.format(),
      totalCents: order.total.cents,
      lines: order.lines.map((l) => ({ productId: l.productId, name: l.name, variantLabel: l.variantLabel, unitPriceCents: l.unitPrice.cents, quantity: l.quantity })),
    };
  }
}
