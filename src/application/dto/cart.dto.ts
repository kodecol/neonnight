import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "@/domain/services/availability";
import { ConsentInputSchema, CustomerInputSchema } from "./checkout.dto";

/** Las bolsas guardadas antes de las variantes traen `watchId` y ninguna variante: se aceptan igual. */
export const CartLineInputSchema = z.preprocess(
  (raw) => (raw && typeof raw === "object" && !("productId" in raw) && "watchId" in raw ? { ...raw, productId: (raw as { watchId: unknown }).watchId } : raw),
  z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  }),
);
export type CartLineInput = z.infer<typeof CartLineInputSchema>;

export const CheckoutInputSchema = z.object({
  lines: z.array(CartLineInputSchema).min(1).max(20),
  /** Importe que el cliente cree que va a pagar; solo se usa para detectar desincronización, nunca para cobrar. */
  expectedTotalCents: z.number().int().nonnegative().optional(),
  customer: CustomerInputSchema,
  consent: ConsentInputSchema,
});

export const QuoteInputSchema = z.object({ lines: z.array(z.unknown()).max(20) });
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export interface CartLineDto {
  productId: string;
  variantId: string;
  variantLabel: string;
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
  paymentMethod: "bold" | "manual";
  total: { cents: number; formatted: string };
  /** URL a la que redirigir al cliente (pasarela o página de gracias). */
  redirectUrl: string;
  priceChanged: boolean;
}
