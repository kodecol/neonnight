import type { Order } from "@/domain/entities/order";

export interface PaymentSession {
  readonly reference: string;
  readonly redirectUrl: string;
  readonly status: "pendiente" | "pagada" | "fallida";
}

/** Lo que la pasarela dice hoy de un cobro (consulta directa, sin esperar el webhook). */
export interface GatewayPaymentStatus {
  readonly status: "pendiente" | "pagada" | "fallida";
  /** Total cobrado en unidades (pesos), si la pasarela lo informa. */
  readonly totalUnits: number | null;
  /** Para el historial del pedido: medio de pago y transacción. */
  readonly detail: string | null;
}

/**
 * Puerto de salida hacia la pasarela (Wompi, Mercado Pago, Stripe…).
 * El dominio y los casos de uso no saben cuál está detrás.
 */
export interface PaymentGateway {
  createSession(order: Order, returnUrl: string): Promise<PaymentSession>;
  /** Estado del cobro según la pasarela; null si no se puede consultar. */
  lookup(reference: string): Promise<GatewayPaymentStatus | null>;
}
