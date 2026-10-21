import type { Product, ProductId } from "../entities/product";

export interface ProductFilter {
  readonly line?: string;
  readonly category?: string;
}

export interface ProductRepository {
  /** Lo más reciente primero. */
  findAll(filter?: ProductFilter): Promise<readonly Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  findByIds(ids: readonly string[]): Promise<readonly Product[]>;
  findFeatured(): Promise<Product | null>;
  /** Inserta o reemplaza por `id`. */
  save(product: Product): Promise<void>;
  delete(id: ProductId): Promise<void>;
  countByCategory(category: string): Promise<number>;
  countByLine(line: string): Promise<number>;
  /** Productos de una marca (por nombre normalizado, ver `brandKey`). */
  countByBrand(name: string): Promise<number>;
  /** Cambia la marca de sus productos al nuevo nombre; devuelve cuántos cambió. */
  renameBrand(from: string, to: string): Promise<number>;
  /**
   * Descuenta stock de una variante de forma atómica. Si no alcanza, la deja
   * en 0 y devuelve false (venta pagada por encima del stock: revisar a mano).
   */
  decrementStock(id: ProductId, variantId: string, quantity: number): Promise<boolean>;
}
