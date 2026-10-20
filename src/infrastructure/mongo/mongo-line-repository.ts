import type { ProductLine } from "@/domain/entities/product-line";
import type { LineRepository } from "@/domain/repositories/line-repository";
import type { DbProvider } from "./client";

export interface LineDoc {
  _id: string;
  label: string;
  description: string;
  order: number;
  template: ProductLine["template"];
  cover: ProductLine["cover"];
}

export const toLineDoc = (l: ProductLine): LineDoc => ({ _id: l.slug, label: l.label, description: l.description, order: l.order, template: l.template, cover: l.cover });

export class MongoLineRepository implements LineRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<LineDoc>("lines");
  }

  async list(): Promise<readonly ProductLine[]> {
    const docs = await (await this.col()).find().sort({ order: 1, label: 1 }).toArray();
    return docs.map((d) => ({ slug: d._id, label: d.label, description: d.description, order: d.order, template: d.template, cover: d.cover }));
  }

  async save(l: ProductLine): Promise<void> {
    const { _id, ...doc } = toLineDoc(l);
    await (await this.col()).replaceOne({ _id }, doc, { upsert: true });
  }

  async delete(slug: string): Promise<void> {
    await (await this.col()).deleteOne({ _id: slug });
  }
}
