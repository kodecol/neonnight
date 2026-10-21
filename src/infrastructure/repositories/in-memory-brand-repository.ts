import type { Brand } from "@/domain/entities/brand";
import type { BrandRepository } from "@/domain/repositories/brand-repository";

const byOrder = (a: Brand, b: Brand) => a.order - b.order || a.name.localeCompare(b.name, "es");

export class InMemoryBrandRepository implements BrandRepository {
  private items: Brand[];

  constructor(items: readonly Brand[] = []) {
    this.items = [...items];
  }

  async list(): Promise<readonly Brand[]> {
    return [...this.items].sort(byOrder);
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    return this.items.find((b) => b.slug === slug) ?? null;
  }

  async save(brand: Brand): Promise<void> {
    const i = this.items.findIndex((b) => b.slug === brand.slug);
    if (i === -1) this.items.push(brand);
    else this.items[i] = brand;
  }

  async delete(slug: string): Promise<void> {
    this.items = this.items.filter((b) => b.slug !== slug);
  }
}
