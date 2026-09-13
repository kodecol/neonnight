import type { Watch } from "@/domain/entities/watch";
import type { WatchFilter, WatchRepository } from "@/domain/repositories/watch-repository";

export class InMemoryWatchRepository implements WatchRepository {
  constructor(private readonly items: readonly Watch[]) {}

  async findAll(filter: WatchFilter = {}): Promise<readonly Watch[]> {
    return this.items.filter((w) => {
      if (filter.category && w.category !== filter.category) return false;
      if (filter.maxPrice && !w.price.isLessThanOrEqual(filter.maxPrice)) return false;
      if (filter.onlyAvailable && w.availability !== "disponible") return false;
      return true;
    });
  }

  async findBySlug(slug: string): Promise<Watch | null> {
    return this.items.find((w) => w.slug.value === slug) ?? null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Watch[]> {
    const set = new Set(ids);
    return this.items.filter((w) => set.has(w.id));
  }

  async findFeatured(): Promise<Watch | null> {
    return this.items.find((w) => w.featured) ?? this.items[0] ?? null;
  }
}
