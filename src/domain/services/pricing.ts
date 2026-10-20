import type { Product, ProductVariant } from "../entities/product";
import type { CartLine } from "../entities/cart-line";
import { Money } from "../value-objects/money";
import { findVariant } from "./availability";

/**
 * Reglas puras de precio. El total autoritativo siempre se calcula aquí,
 * en el servidor, a partir de las entidades — nunca del importe que llega
 * del cliente.
 */
export function lineTotal(variant: ProductVariant, quantity: number): Money {
  return variant.price.multiply(quantity);
}

export function cartTotal(lines: readonly CartLine[], productsById: ReadonlyMap<string, Product>): Money {
  return lines.reduce((acc, line) => {
    const product = productsById.get(line.productId);
    const variant = product ? findVariant(product, line.variantId) : null;
    if (!variant) return acc;
    return acc.add(lineTotal(variant, line.quantity));
  }, Money.zero());
}

/** Precio "desde": el menor de las variantes con stock, o el menor de todas si no queda ninguna. */
export function startingPrice(product: Product): Money {
  const inStock = product.variants.filter((v) => v.stock > 0);
  const pool = inStock.length > 0 ? inStock : product.variants;
  return pool.reduce((min, v) => (v.price.cents < min.cents ? v.price : min), pool[0]!.price);
}

export function hasPriceRange(product: Product): boolean {
  return new Set(product.variants.map((v) => v.price.cents)).size > 1;
}
