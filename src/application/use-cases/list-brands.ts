import { brandKey } from "@/domain/entities/brand";
import type { BrandRepository } from "@/domain/repositories/brand-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { BrandsCopyRepository } from "../ports/brands-copy";
import type { MarqueeDto } from "../dto/brand.dto";

/**
 * Marquee de la home: las marcas visibles que tienen al menos un producto, en
 * el orden del panel › Marcas. El rótulo y el aviso, los editados o los del código.
 */
export class ListMarqueeBrands {
  constructor(private readonly deps: { brands: BrandRepository; products: ProductRepository; brandsCopy: BrandsCopyRepository }) {}

  async execute(defaults: { label: string; disclaimer: string }): Promise<MarqueeDto> {
    const [brands, products, copy] = await Promise.all([
      this.deps.brands.list(),
      this.deps.products.findAll(),
      this.deps.brandsCopy.get().catch(() => ({ label: null, disclaimer: null })),
    ]);
    const used = new Set(products.map((p) => brandKey(p.brand)));
    return {
      label: copy.label ?? defaults.label,
      disclaimer: copy.disclaimer ?? defaults.disclaimer,
      brands: brands.filter((b) => b.visible && used.has(brandKey(b.name))).map((b) => ({ name: b.name, logo: b.logo ? { ...b.logo } : null, color: b.color })),
    };
  }
}
