import type { ProductRepository } from "@/domain/repositories/product-repository";
import { isPurchasable } from "@/domain/services/availability";
import { toProductSummaryDto, type ProductSummaryDto } from "../dto/product.dto";

/** Otras piezas de la misma línea: primero la misma categoría, luego lo disponible. */
export class ListRelatedProducts {
  constructor(private readonly products: ProductRepository) {}

  async execute(slug: string, limit = 4): Promise<ProductSummaryDto[]> {
    const self = await this.products.findBySlug(slug);
    if (!self) return [];
    const pool = (await this.products.findAll({ line: self.line })).filter((p) => p.id !== self.id);
    const score = (p: (typeof pool)[number]) => (p.category === self.category ? 0 : 2) + (p.variants.some((v) => isPurchasable(p, v)) ? 0 : 1);
    return pool
      .map((p, i) => ({ p, i }))
      .sort((a, b) => score(a.p) - score(b.p) || a.i - b.i)
      .slice(0, limit)
      .map(({ p }) => toProductSummaryDto(p));
  }
}
