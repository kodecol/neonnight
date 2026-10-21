import type { Product, ProductId } from "@/domain/entities/product";
import type { ProductFilter, ProductRepository } from "@/domain/repositories/product-repository";
import { brandKey } from "@/domain/entities/brand";

/** Orden: lo más reciente primero (las altas nuevas van al principio). */
export class InMemoryProductRepository implements ProductRepository {
  private items: Product[];

  constructor(items: readonly Product[]) {
    this.items = [...items];
  }

  async findAll(filter: ProductFilter = {}): Promise<readonly Product[]> {
    return this.items.filter((p) => (!filter.line || p.line === filter.line) && (!filter.category || p.category === filter.category));
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.items.find((p) => p.slug.value === slug) ?? null;
  }

  async findById(id: string): Promise<Product | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Product[]> {
    const set = new Set(ids);
    return this.items.filter((p) => set.has(p.id));
  }

  async findFeatured(): Promise<Product | null> {
    return this.items.find((p) => p.featured) ?? this.items[0] ?? null;
  }

  async save(product: Product): Promise<void> {
    const i = this.items.findIndex((p) => p.id === product.id);
    if (i === -1) this.items.unshift(product);
    else this.items[i] = product;
  }

  async delete(id: ProductId): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id);
  }

  async countByCategory(category: string): Promise<number> {
    return this.items.filter((p) => p.category === category).length;
  }

  async countByLine(line: string): Promise<number> {
    return this.items.filter((p) => p.line === line).length;
  }

  async countByBrand(name: string): Promise<number> {
    const key = brandKey(name);
    return this.items.filter((p) => brandKey(p.brand) === key).length;
  }

  async renameBrand(from: string, to: string): Promise<number> {
    const key = brandKey(from);
    let n = 0;
    this.items = this.items.map((p) => (brandKey(p.brand) === key ? (n++, { ...p, brand: to, updatedAt: new Date() }) : p));
    return n;
  }

  async decrementStock(id: ProductId, variantId: string, quantity: number): Promise<boolean> {
    const i = this.items.findIndex((p) => p.id === id);
    const p = this.items[i];
    const v = p?.variants.find((x) => x.id === variantId);
    if (!p || !v) return false;
    const enough = v.stock >= quantity;
    this.items[i] = { ...p, variants: p.variants.map((x) => (x.id === variantId ? { ...x, stock: Math.max(0, x.stock - quantity) } : x)), updatedAt: new Date() };
    return enough;
  }
}
