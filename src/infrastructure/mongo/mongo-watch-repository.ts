import type { Filter } from "mongodb";
import type { Watch, WatchCategory, WatchId } from "@/domain/entities/watch";
import type { WatchFilter, WatchRepository } from "@/domain/repositories/watch-repository";
import type { DbProvider } from "./client";
import { fromWatchDoc, toWatchDoc, type WatchDoc } from "./watch-mapper";

export class MongoWatchRepository implements WatchRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<WatchDoc>("watches");
  }

  private async find(query: Filter<WatchDoc>): Promise<Watch[]> {
    const docs = await (await this.col()).find(query).sort({ createdAt: -1 }).toArray();
    return docs.map(fromWatchDoc);
  }

  async findAll(filter: WatchFilter = {}): Promise<readonly Watch[]> {
    const q: Filter<WatchDoc> = {};
    if (filter.category) q.category = filter.category;
    if (filter.maxPrice) q.priceCents = { $lte: filter.maxPrice.cents };
    if (filter.onlyAvailable) q.availability = "disponible";
    return this.find(q);
  }

  async findBySlug(slug: string): Promise<Watch | null> {
    const d = await (await this.col()).findOne({ slug });
    return d ? fromWatchDoc(d) : null;
  }

  async findById(id: string): Promise<Watch | null> {
    const d = await (await this.col()).findOne({ _id: id });
    return d ? fromWatchDoc(d) : null;
  }

  async findByIds(ids: readonly string[]): Promise<readonly Watch[]> {
    return ids.length ? this.find({ _id: { $in: [...ids] } }) : [];
  }

  async findFeatured(): Promise<Watch | null> {
    const col = await this.col();
    const d = (await col.findOne({ featured: true })) ?? (await col.find().sort({ createdAt: -1 }).limit(1).next());
    return d ? fromWatchDoc(d) : null;
  }

  async save(watch: Watch): Promise<void> {
    const col = await this.col();
    const prev = await col.findOne({ _id: watch.id }, { projection: { createdAt: 1 } });
    await col.replaceOne({ _id: watch.id }, toWatchDoc(watch, prev?.createdAt ?? new Date()), { upsert: true });
  }

  async delete(id: WatchId): Promise<void> {
    await (await this.col()).deleteOne({ _id: id });
  }

  async countByCategory(category: WatchCategory): Promise<number> {
    return (await this.col()).countDocuments({ category });
  }
}
