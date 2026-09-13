import { z } from "zod";

export const CartLineInputSchema = z.object({
  watchId: z.string().min(1),
  quantity: z.number().int().min(1).max(1),
});
export type CartLineInput = z.infer<typeof CartLineInputSchema>;

export const CheckoutInputSchema = z.object({
  lines: z.array(CartLineInputSchema).min(1).max(20),
  /** Importe que el cliente cree que va a pagar; solo se usa para detectar desincronización, nunca para cobrar. */
  expectedTotalCents: z.number().int().nonnegative().optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export interface CartLineDto {
  watchId: string;
  slug: string;
  name: string;
  subtitle: string;
  quantity: number;
  unitPrice: { cents: number; formatted: string };
  lineTotal: { cents: number; formatted: string };
}

export interface CartDto {
  lines: CartLineDto[];
  total: { cents: number; formatted: string };
  count: number;
}

export interface CheckoutResultDto {
  orderId: string;
  status: "pendiente" | "pagada" | "fallida";
  total: { cents: number; formatted: string };
  /** URL a la que redirigir al cliente (pasarela o página de gracias). */
  redirectUrl: string;
  priceChanged: boolean;
}
