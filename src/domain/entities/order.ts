import type { Money } from "../value-objects/money";
import type { WatchId } from "./watch";

export type OrderId = string & { readonly __brand: "OrderId" };
export const orderId = (value: string): OrderId => value as OrderId;

export type OrderStatus = "pendiente" | "pagada" | "fallida" | "cancelada";

export interface OrderLine {
  readonly watchId: WatchId;
  readonly slug: string;
  readonly name: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

export interface Order {
  readonly id: OrderId;
  readonly lines: readonly OrderLine[];
  readonly total: Money;
  readonly status: OrderStatus;
  readonly createdAt: Date;
  readonly paymentReference: string | null;
}
