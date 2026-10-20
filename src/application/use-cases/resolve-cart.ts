import type { ProductRepository } from "@/domain/repositories/product-repository";
import { cartTotal, lineTotal } from "@/domain/services/pricing";
import { findVariant } from "@/domain/services/availability";
import { productDisplayName, productId, type Product } from "@/domain/entities/product";
import type { CartLine } from "@/domain/entities/cart-line";
import { CartLineInputSchema, type CartDto } from "../dto/cart.dto";

/**
 * Convierte las líneas persistidas en el cliente (solo ids) en un carrito
 * con nombres y precios autoritativos del servidor. Descarta productos o
 * variantes que ya no existen.
 */
export class ResolveCart {
  constructor(private readonly products: ProductRepository) {}

  async execute(rawLines: readonly unknown[]): Promise<CartDto> {
    const lines = rawLines.map((l) => CartLineInputSchema.safeParse(l)).flatMap((r) => (r.success ? [r.data] : []));
    const products = await this.products.findByIds(lines.map((l) => l.productId));
    const byId = new Map<string, Product>(products.map((p) => [p.id, p]));

    const kept = lines.flatMap((l) => {
      const p = byId.get(l.productId);
      const v = p ? findVariant(p, l.variantId) : null;
      return p && v ? [{ p, v, quantity: l.quantity }] : [];
    });
    const cartLines: CartLine[] = kept.map(({ p, v, quantity }) => ({ productId: productId(p.id), variantId: v.id, quantity }));
    const total = cartTotal(cartLines, byId);
    return {
      lines: kept.map(({ p, v, quantity }) => {
        const sum = lineTotal(v, quantity);
        return {
          productId: p.id,
          variantId: v.id,
          variantLabel: v.label,
          slug: p.slug.value,
          name: productDisplayName(p),
          subtitle: p.subtitle,
          quantity,
          unitPrice: { cents: v.price.cents, formatted: v.price.format() },
          lineTotal: { cents: sum.cents, formatted: sum.format() },
        };
      }),
      total: { cents: total.cents, formatted: total.format() },
      count: kept.reduce((n, l) => n + l.quantity, 0),
    };
  }
}
