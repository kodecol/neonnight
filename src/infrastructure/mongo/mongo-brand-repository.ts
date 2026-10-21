import type { Brand } from "@/domain/entities/brand";
import type { BrandRepository } from "@/domain/repositories/brand-repository";
import type { DbProvider } from "./client";

export type BrandDoc = Omit<Brand, "slug"> & { _id: string };

export const toBrandDoc = ({ slug, ...rest }: Brand): BrandDoc => ({ _id: slug, ...rest, lines: [...rest.lines] });

/** Marcas del catálogo (colección `brands`, `_id` = slug). */
export class MongoBrandRepository implements BrandRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<BrandDoc>("brands");
  }

  async list(): Promise<readonly Brand[]> {
    const docs = await (await this.col()).find().sort({ order: 1, name: 1 }).toArray();
    return docs.map(({ _id, ...b }) => ({ slug: _id, ...b, lines: b.lines ?? [], description: b.description ?? null, color: b.color ?? null }));
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    const d = await (await this.col()).findOne({ _id: slug });
    if (!d) return null;
    const { _id, ...b } = d;
    return { slug: _id, ...b, lines: b.lines ?? [], description: b.description ?? null, color: b.color ?? null };
  }

  async save(brand: Brand): Promise<void> {
    const { _id, ...doc } = toBrandDoc(brand);
    await (await this.col()).replaceOne({ _id }, doc, { upsert: true });
  }

  async delete(slug: string): Promise<void> {
    await (await this.col()).deleteOne({ _id: slug });
  }
}
