import type { Category } from "@/domain/entities/category";
import type { CategoryRepository } from "@/domain/repositories/category-repository";

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly items = new Map<string, Category>();

  constructor(seed: readonly Category[] = []) {
    for (const c of seed) this.items.set(c.slug, c);
  }

  async list(): Promise<readonly Category[]> {
    return [...this.items.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }

  async save(category: Category): Promise<void> {
    this.items.set(category.slug, category);
  }

  async delete(slug: string): Promise<void> {
    this.items.delete(slug);
  }
}
