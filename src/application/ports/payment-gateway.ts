import type { Order } from "@/domain/entities/order";

export interface PaymentSession {
  readonly reference: string;
  readonly redirectUrl: string;
  readonly status: "pendiente" | "pagada" | "fallida";
}

/**
 * Puerto de salida hacia la pasarela (Wompi, Mercado Pago, Stripe…).
 * El dominio y los casos de uso no saben cuál está detrás.
 */
export interface PaymentGateway {
  createSession(order: Order, returnUrl: string): Promise<PaymentSession>;
}
