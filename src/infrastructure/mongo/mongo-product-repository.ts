import type { Filter } from "mongodb";
import type { Product, ProductId } from "@/domain/entities/product";
import type { ProductFilter, ProductRepository } from "@/domain/repositories/product-repository";
import type { DbProvider } from "./client";
import { fromProductDoc, toProductDoc, type ProductDoc } from "./product-mapper";

export class MongoProductRepository implements ProductRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<ProductDoc>("products");
  }

  private async find(query: Filter<ProductDoc>): Promise<Product[]> {
    const docs = await (await this.col()).find(query).sort({ createdAt: -1 }).toArray();
    return docs.map(fromProductDoc);
  }

  async findAll(filter: ProductFilter = {}): Promise<readonly Product[]> {
    const q: Filter<ProductDoc> = {};
    if (filter.line) q.line = filter.line;
    if (filter.category) q.category = filter.category;
    return this.find(q);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const d = await (await this.col()).findOne({ slug });
    return d ? fromProductDoc(d) : null;
  }

  async findById(id: string): Promise<Product | null> {
    const d = await (await this.col()).findOne({ _id: id });
    return d ? fromProductDoc(d) : null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Product[]> {
    return ids.length ? this.find({ _id: { $in: [...ids] } }) : [];
  }

  async findFeatured(): Promise<Product | null> {
    const col = await this.col();
    const d = (await col.findOne({ featured: true })) ?? (await col.find().sort({ createdAt: -1 }).limit(1).next());
    return d ? fromProductDoc(d) : null;
  }

  async save(product: Product): Promise<void> {
    const col = await this.col();
    const prev = await col.findOne({ _id: product.id }, { projection: { createdAt: 1 } });
    await col.replaceOne({ _id: product.id }, toProductDoc(product, prev?.createdAt ?? new Date()), { upsert: true });
  }

  async delete(id: ProductId): Promise<void> {
    await (await this.col()).deleteOne({ _id: id });
  }

  async countByCategory(category: string): Promise<number> {
    return (await this.col()).countDocuments({ category });
  }

  async countByLine(line: string): Promise<number> {
    return (await this.col()).countDocuments({ line });
  }

  async decrementStock(id: ProductId, variantId: string, quantity: number): Promise<boolean> {
    const col = await this.col();
    const now = new Date();
    // $elemMatch + operador posicional: descuenta solo si esa variante tiene stock suficiente.
    const res = await col.updateOne(
      { _id: id, variants: { $elemMatch: { id: variantId, stock: { $gte: quantity } } } },
      { $inc: { "variants.$.stock": -quantity }, $set: { updatedAt: now } },
    );
    if (res.modifiedCount === 1) return true;
    await col.updateOne({ _id: id, "variants.id": variantId }, { $set: { "variants.$.stock": 0, updatedAt: now } });
    return false;
  }
}
