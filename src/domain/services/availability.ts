import type { Product, ProductVariant } from "../entities/product";
import type { SaleMode } from "../entities/product-line";

/** Tope por línea de la bolsa, aunque haya más stock. */
export const MAX_QUANTITY_PER_LINE = 10;
/** Con este stock total o menos, una línea por unidades avisa "Últimas unidades". */
export const LOW_STOCK_THRESHOLD = 3;

/** Variante pedida; sin id, la única si solo hay una (bolsas antiguas guardaban solo el producto). */
export function findVariant(product: Product, variantId?: string | null): ProductVariant | null {
  if (variantId) return product.variants.find((v) => v.id === variantId) ?? null;
  return product.variants.length === 1 ? product.variants[0]! : null;
}

export function totalStock(product: Product): number {
  return product.variants.reduce((n, v) => n + v.stock, 0);
}

export function isPurchasable(product: Product, variant: ProductVariant, quantity = 1): boolean {
  return product.availability === "disponible" && variant.stock >= quantity;
}

export type ProductStatus = "disponible" | "ultimas" | "reservado" | "vendido" | "agotado";

/** Estado visible: el manual manda; si no, se deriva del stock según cómo se vende la línea. */
export function productStatus(product: Product, mode: SaleMode): ProductStatus {
  if (product.availability !== "disponible") return product.availability;
  const stock = totalStock(product);
  if (stock === 0) return mode === "pieza" ? "vendido" : "agotado";
  if (mode === "unidades" && stock <= LOW_STOCK_THRESHOLD) return "ultimas";
  return "disponible";
}
