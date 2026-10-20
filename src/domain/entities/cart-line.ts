import type { ProductId } from "./product";

export interface CartLine {
  readonly productId: ProductId;
  readonly variantId: string;
  readonly quantity: number;
}
