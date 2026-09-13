import type { Watch, WatchCategory } from "../entities/watch";
import type { Money } from "../value-objects/money";

export interface WatchFilter {
  readonly category?: WatchCategory;
  readonly maxPrice?: Money;
  readonly onlyAvailable?: boolean;
}

export interface WatchRepository {
  findAll(filter?: WatchFilter): Promise<readonly Watch[]>;
  findBySlug(slug: string): Promise<Watch | null>;
  findByIds(ids: readonly string[]): Promise<readonly Watch[]>;
  findFeatured(): Promise<Watch | null>;
}
