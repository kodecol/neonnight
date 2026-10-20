import type { Category } from "@/domain/entities/category";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { DbProvider } from "./client";

export interface CategoryDoc {
  _id: string;
  label: string;
  order: number;
  line: string;
}

export class MongoCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<CategoryDoc>("categories");
  }

  async list(): Promise<readonly Category[]> {
    const docs = await (await this.col()).find().sort({ order: 1, label: 1 }).toArray();
    return docs.map((d) => ({ slug: d._id, label: d.label, order: d.order, line: d.line }));
  }

  async save(c: Category): Promise<void> {
    await (await this.col()).replaceOne({ _id: c.slug }, { label: c.label, order: c.order, line: c.line }, { upsert: true });
  }

  async delete(slug: string): Promise<void> {
    await (await this.col()).deleteOne({ _id: slug });
  }
}
