import type { Watch, WatchCategory, WatchId } from "../entities/watch";
import type { Money } from "../value-objects/money";

export interface WatchFilter {
  readonly category?: WatchCategory;
  readonly maxPrice?: Money;
  readonly onlyAvailable?: boolean;
}

export interface WatchRepository {
  findAll(filter?: WatchFilter): Promise<readonly Watch[]>;
  findBySlug(slug: string): Promise<Watch | null>;
  findById(id: string): Promise<Watch | null>;
  findByIds(ids: readonly string[]): Promise<readonly Watch[]>;
  findFeatured(): Promise<Watch | null>;
  /** Inserta o reemplaza por `id`. */
  save(watch: Watch): Promise<void>;
  delete(id: WatchId): Promise<void>;
  countByCategory(category: WatchCategory): Promise<number>;
}
