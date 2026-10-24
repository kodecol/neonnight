import type { Order } from "@/domain/entities/order";
import type { GatewayPaymentStatus, PaymentGateway, PaymentSession } from "@/application/ports/payment-gateway";

/**
 * Stub: no cobra nada. Devuelve la orden como "pendiente" y redirige a la
 * página de gracias. Sustituir por WompiPaymentGateway / MercadoPagoPaymentGateway.
 */
export class NoopPaymentGateway implements PaymentGateway {
  async createSession(order: Order, returnUrl: string): Promise<PaymentSession> {
    const url = new URL(returnUrl);
    url.searchParams.set("orden", order.id);
    return { reference: `noop-${order.id}`, redirectUrl: url.toString(), status: "pendiente" };
  }

  async lookup(): Promise<GatewayPaymentStatus | null> {
    return null;
  }
}
