import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { LineRepository } from "@/domain/repositories/line-repository";
import { totalStock } from "@/domain/services/availability";
import type { AdminProductRowDto } from "../../dto/admin.dto";
import { toProductSummaryDto } from "../../dto/product.dto";

export class ListAdminProducts {
  constructor(private readonly deps: { products: ProductRepository; categories: CategoryRepository; lines: LineRepository }) {}

  async execute(): Promise<AdminProductRowDto[]> {
    const [products, categories, lines] = await Promise.all([this.deps.products.findAll(), this.deps.categories.list(), this.deps.lines.list()]);
    const catLabels = new Map(categories.map((c) => [c.slug, c.label]));
    const lineLabels = new Map(lines.map((l) => [l.slug, l.label]));
    return products.map((p) => {
      const s = toProductSummaryDto(p);
      return {
        id: p.id,
        slug: s.slug,
        kind: s.kind,
        name: s.name,
        reference: p.reference.value,
        line: p.line,
        lineLabel: lineLabels.get(p.line) ?? p.line,
        category: p.category,
        categoryLabel: catLabels.get(p.category) ?? p.category,
        priceFormatted: s.price.formatted,
        priceFrom: s.priceFrom,
        stock: totalStock(p),
        variantCount: p.variants.length,
        status: s.status,
        featured: p.featured,
        thumb: p.media.front?.src ?? null,
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }
}
