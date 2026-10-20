import type { Category } from "@/domain/entities/category";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { DbProvider } from "./client";

interface CategoryDoc {
  _id: string;
  label: string;
  order: number;
}

export class MongoCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<CategoryDoc>("categories");
  }

  async list(): Promise<readonly Category[]> {
    const docs = await (await this.col()).find().sort({ order: 1, label: 1 }).toArray();
    return docs.map((d) => ({ slug: d._id, label: d.label, order: d.order }));
  }

  async save(c: Category): Promise<void> {
    await (await this.col()).replaceOne({ _id: c.slug }, { label: c.label, order: c.order }, { upsert: true });
  }

  async delete(slug: string): Promise<void> {
    await (await this.col()).deleteOne({ _id: slug });
  }
}
