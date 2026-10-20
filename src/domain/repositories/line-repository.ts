import type { ProductLine } from "../entities/product-line";

export interface LineRepository {
  /** Ordenadas por `order` ascendente. */
  list(): Promise<readonly ProductLine[]>;
  save(line: ProductLine): Promise<void>;
  delete(slug: string): Promise<void>;
}
