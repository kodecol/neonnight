import type { Watch, WatchCategory, WatchId } from "@/domain/entities/watch";
import type { WatchFilter, WatchRepository } from "@/domain/repositories/watch-repository";

/** Orden: lo más reciente primero (las altas nuevas van al principio). */
export class InMemoryWatchRepository implements WatchRepository {
  private items: Watch[];

  constructor(items: readonly Watch[]) {
    this.items = [...items];
  }

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

  async findById(id: string): Promise<Watch | null> {
    return this.items.find((w) => w.id === id) ?? null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Watch[]> {
    const set = new Set(ids);
    return this.items.filter((w) => set.has(w.id));
  }

  async findFeatured(): Promise<Watch | null> {
    return this.items.find((w) => w.featured) ?? this.items[0] ?? null;
  }

  async save(watch: Watch): Promise<void> {
    const i = this.items.findIndex((w) => w.id === watch.id);
    if (i === -1) this.items.unshift(watch);
    else this.items[i] = watch;
  }

  async delete(id: WatchId): Promise<void> {
    this.items = this.items.filter((w) => w.id !== id);
  }

  async countByCategory(category: WatchCategory): Promise<number> {
    return this.items.filter((w) => w.category === category).length;
  }
}
