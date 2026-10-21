import type { Money } from "../value-objects/money";
import type { ProductId } from "./product";

export type OrderId = string & { readonly __brand: "OrderId" };
export const orderId = (value: string): OrderId => value as OrderId;

export type OrderStatus = "pendiente" | "pagada" | "fallida" | "cancelada";

export interface OrderLine {
  readonly productId: ProductId;
  readonly variantId: string;
  /** Presentación tal como se vendió ("100 ml"); vacío si es variante única. */
  readonly variantLabel: string;
  readonly slug: string;
  readonly name: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

export const DOCUMENT_TYPES = ["CC", "CE", "NIT", "PP"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Datos del comprador para facturar y entregar (Ley 1581: solo para la compra). */
export interface OrderCustomer {
  readonly name: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly city: string;
  readonly department: string;
  readonly notes: string;
}

/** Qué versión de los términos y de la política de privacidad aceptó el cliente, y cuándo. */
export interface OrderConsent {
  readonly termsVersion: string;
  readonly privacyVersion: string;
  readonly acceptedAt: Date;
}

/** `bold`: pago en línea. `manual`: sin pasarela; se coordina con el cliente (WhatsApp, transferencia). */
export type PaymentMethod = "bold" | "manual";

export interface Order {
  readonly id: OrderId;
  readonly lines: readonly OrderLine[];
  /** Total cobrado: subtotal + envío. */
  readonly total: Money;
  readonly shipping: Money;
  readonly status: OrderStatus;
  readonly createdAt: Date;
  readonly paymentReference: string | null;
  readonly paymentMethod: PaymentMethod;
  /** null en órdenes anteriores al checkout con datos. */
  readonly customer: OrderCustomer | null;
  readonly consent: OrderConsent | null;
}

/** Referencia legible para el cliente: NN-AAMMDD-XXXXX. */
export function newOrderId(now: Date, random: string): OrderId {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = random.replace(/[^a-z0-9]/gi, "").toUpperCase().padStart(5, "0").slice(-5);
  return orderId(`NN-${d}-${suffix}`);
}
