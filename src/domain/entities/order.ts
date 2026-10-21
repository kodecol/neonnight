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

export type OrderEventType = "creado" | "pagado" | "cancelado" | "fallido" | "eliminado" | "restaurado" | "pago-tras-eliminar" | "revisado";
export type OrderEventActor = "admin" | "webhook" | "cliente";

/** Auditoría: qué le pasó al pedido, cuándo y quién lo hizo. */
export interface OrderEvent {
  readonly at: Date;
  readonly type: OrderEventType;
  readonly by: OrderEventActor;
  readonly note?: string;
}

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
  /** Borrado suave: en la papelera desde esta fecha; null si está activo. */
  readonly deletedAt: Date | null;
  /** Más antiguos primero. Vacío en órdenes anteriores a la auditoría. */
  readonly events: readonly OrderEvent[];
  /** Marca para revisar a mano (p. ej. un pago que llegó a un pedido eliminado); null si no hay nada. */
  readonly review: string | null;
}

/** Días que un pedido eliminado espera en la papelera antes de purgarse. */
export const ORDER_TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Vigencia del link de pago de Bold (ver BoldPaymentGateway). */
export const PAYMENT_LINK_TTL_MS = 30 * 60 * 1000;

export const REVIEW_PAID_AFTER_DELETE = "Pago recibido de pedido eliminado — revisar";
export const REVIEW_PAID_AFTER_CANCEL = "Pago recibido de pedido cancelado — revisar";
export const reviewShortStock = (slugs: readonly string[]) => `Stock insuficiente al confirmar el pago (${slugs.join(", ")}) — revisar`;

/** Solo se eliminan pedidos pendientes (pagados, cancelados y rechazados quedan como registro). */
export const isDeletable = (o: Order): boolean => o.deletedAt === null && o.status === "pendiente";

/** Fecha en que la papelera purga el pedido; null si no está eliminado. */
export const purgeDate = (o: Order): Date | null => (o.deletedAt ? new Date(o.deletedAt.getTime() + ORDER_TRASH_DAYS * DAY_MS) : null);

/** Corte de la papelera: lo eliminado antes de esta fecha ya venció. */
export const trashCutoff = (now: Date): Date => new Date(now.getTime() - ORDER_TRASH_DAYS * DAY_MS);

/** El cliente aún podría pagar: pedido de Bold con link creado hace menos de 30 minutos. */
export const paymentLinkMayBeLive = (o: Order, now: Date): boolean =>
  o.paymentMethod === "bold" && Boolean(o.paymentReference) && now.getTime() - o.createdAt.getTime() < PAYMENT_LINK_TTL_MS;

/** Añade eventos al historial (inmutable). */
export const withEvents = (o: Order, ...events: OrderEvent[]): Order => ({ ...o, events: [...o.events, ...events] });

/** Referencia legible para el cliente: <PREFIJO>-AAMMDD-XXXXX (prefijo de la tienda, p. ej. "NN"). */
export function newOrderId(now: Date, random: string, prefix: string): OrderId {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = random.replace(/[^a-z0-9]/gi, "").toUpperCase().padStart(5, "0").slice(-5);
  const p = prefix.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 4) || "P";
  return orderId(`${p}-${d}-${suffix}`);
}
