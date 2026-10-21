import type { Brand } from "@/domain/entities/brand";
import type { Category } from "@/domain/entities/category";
import type { Product } from "@/domain/entities/product";
import type { ProductLine } from "@/domain/entities/product-line";
import type { BrandRepository } from "@/domain/repositories/brand-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { LineRepository } from "@/domain/repositories/line-repository";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import { DomainError } from "@/domain/errors";

export interface CatalogPack {
  lines: readonly ProductLine[];
  categories: readonly Category[];
  brands: readonly Brand[];
  products: readonly Product[];
}

export interface SeedResult {
  niche: string;
  lines: number;
  categories: number;
  brands: number;
  products: number;
  /** Productos que ya existían con el mismo id y no se tocaron. */
  skipped: number;
}

/**
 * `seed --niche`: siembra un catálogo de demostración. Idempotente: inserta
 * solo lo que falta (por slug o id) y nunca pisa lo editado en el panel.
 * Si la tienda ya tiene productos propios (no de demo), no siembra salvo `force`.
 */
export class SeedDemoCatalog {
  constructor(private readonly deps: { lines: LineRepository; categories: CategoryRepository; brands: BrandRepository; products: ProductRepository }) {}

  async execute(niche: string, pack: CatalogPack, opts: { force?: boolean } = {}): Promise<SeedResult> {
    const [lines, categories, brands, products] = await Promise.all([
      this.deps.lines.list(),
      this.deps.categories.list(),
      this.deps.brands.list(),
      this.deps.products.findAll(),
    ]);
    const own = products.filter((p) => !String(p.id).startsWith("demo-"));
    if (own.length && !opts.force) throw new DomainError(`La tienda ya tiene ${own.length} productos propios: no se siembra la demo (usa --force para sembrarla igual).`);

    const has = <T>(list: readonly T[], key: (x: T) => string) => new Set(list.map(key));
    const lineSlugs = has(lines, (l) => l.slug);
    const catSlugs = has(categories, (c) => c.slug);
    const brandSlugs = has(brands, (b) => b.slug);
    const productIds = has(products, (p) => String(p.id));

    const newLines = pack.lines.filter((l) => !lineSlugs.has(l.slug));
    const newCats = pack.categories.filter((c) => !catSlugs.has(c.slug));
    const newBrands = pack.brands.filter((b) => !brandSlugs.has(b.slug));
    const newProducts = pack.products.filter((p) => !productIds.has(String(p.id)));
    for (const l of newLines) await this.deps.lines.save(l);
    for (const c of newCats) await this.deps.categories.save(c);
    for (const b of newBrands) await this.deps.brands.save(b);
    for (const p of newProducts) await this.deps.products.save(p);
    return { niche, lines: newLines.length, categories: newCats.length, brands: newBrands.length, products: newProducts.length, skipped: pack.products.length - newProducts.length };
  }
}
