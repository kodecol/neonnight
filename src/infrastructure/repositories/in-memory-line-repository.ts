import type { ProductLine } from "@/domain/entities/product-line";
import type { LineRepository } from "@/domain/repositories/line-repository";

export class InMemoryLineRepository implements LineRepository {
  private readonly items = new Map<string, ProductLine>();

  constructor(seed: readonly ProductLine[] = []) {
    for (const l of seed) this.items.set(l.slug, l);
  }

  async list(): Promise<readonly ProductLine[]> {
    return [...this.items.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }

  async save(line: ProductLine): Promise<void> {
    this.items.set(line.slug, line);
  }

  async delete(slug: string): Promise<void> {
    this.items.delete(slug);
  }
}
