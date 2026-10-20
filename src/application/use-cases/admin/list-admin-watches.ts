import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import { watchDisplayName } from "@/domain/entities/watch";
import type { AdminWatchRowDto } from "../../dto/admin.dto";

export class ListAdminWatches {
  constructor(private readonly deps: { watches: WatchRepository; categories: CategoryRepository }) {}

  async execute(): Promise<AdminWatchRowDto[]> {
    const [watches, categories] = await Promise.all([this.deps.watches.findAll(), this.deps.categories.list()]);
    const labels = new Map(categories.map((c) => [c.slug, c.label]));
    return watches.map((w) => ({
      id: w.id,
      slug: w.slug.value,
      name: watchDisplayName(w),
      reference: w.reference.value,
      priceFormatted: w.price.format(),
      category: w.category,
      categoryLabel: labels.get(w.category) ?? w.category,
      availability: w.availability,
      featured: w.featured,
      thumb: w.media.front?.src ?? null,
      updatedAt: w.updatedAt.toISOString(),
    }));
  }
}
