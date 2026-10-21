import type { BrandsCopy, BrandsCopyRepository } from "@/application/ports/brands-copy";
import type { DbProvider } from "./client";

interface BrandsCopyDoc extends BrandsCopy {
  _id: "brands";
  updatedAt: Date;
}

/** Rótulo y aviso del marquee en la colección `settings` (`_id: "brands"`). */
export class MongoBrandsCopyRepository implements BrandsCopyRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<BrandsCopyDoc>("settings");
  }

  async get(): Promise<BrandsCopy> {
    const d = await (await this.col()).findOne({ _id: "brands" });
    return { label: d?.label ?? null, disclaimer: d?.disclaimer ?? null };
  }

  async save(copy: BrandsCopy): Promise<void> {
    await (await this.col()).replaceOne({ _id: "brands" }, { label: copy.label, disclaimer: copy.disclaimer, updatedAt: new Date() }, { upsert: true });
  }
}
