import type { WatchRepository } from "@/domain/repositories/watch-repository";
import { cartTotal } from "@/domain/services/pricing";
import { watchDisplayName, watchId, type Watch } from "@/domain/entities/watch";
import type { CartLine } from "@/domain/entities/cart-line";
import { CartLineInputSchema, type CartDto, type CartLineInput } from "../dto/cart.dto";

/**
 * Convierte las líneas persistidas en el cliente (solo ids) en un carrito
 * con nombres y precios autoritativos del servidor. Descarta ids desconocidos.
 */
export class ResolveCart {
  constructor(private readonly watches: WatchRepository) {}

  async execute(rawLines: readonly unknown[]): Promise<CartDto> {
    const lines: CartLineInput[] = rawLines
      .map((l) => CartLineInputSchema.safeParse(l))
      .flatMap((r) => (r.success ? [r.data] : []));

    const watches = await this.watches.findByIds(lines.map((l) => l.watchId));
    const byId = new Map<string, Watch>(watches.map((w) => [w.id, w]));
    const kept = lines.filter((l) => byId.has(l.watchId));

    const cartLines: CartLine[] = kept.map((l) => ({ watchId: watchId(l.watchId), quantity: l.quantity }));
    const total = cartTotal(cartLines, byId);
    return {
      lines: kept.map((l) => {
        const w = byId.get(l.watchId)!;
        const lineTotal = w.price.multiply(l.quantity);
        return {
          watchId: w.id,
          slug: w.slug.value,
          name: watchDisplayName(w),
          subtitle: w.subtitle,
          quantity: l.quantity,
          unitPrice: { cents: w.price.cents, formatted: w.price.format() },
          lineTotal: { cents: lineTotal.cents, formatted: lineTotal.format() },
        };
      }),
      total: { cents: total.cents, formatted: total.format() },
      count: kept.reduce((n, l) => n + l.quantity, 0),
    };
  }
}
