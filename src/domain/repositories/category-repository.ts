import type { Category } from "../entities/category";

export interface CategoryRepository {
  /** Ordenadas por `order` ascendente. */
  list(): Promise<readonly Category[]>;
  save(category: Category): Promise<void>;
  delete(slug: string): Promise<void>;
}
