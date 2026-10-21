import type { BrandFingerprintStore } from "@/application/use-cases/admin/brand-config";
import type { DbProvider } from "../mongo/client";

/** `meta/{_id:"brand"}`: huella del último brand.json aplicado. */
export class MongoBrandFingerprint implements BrandFingerprintStore {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<{ _id: string; hash: string; at: Date }>("meta");
  }

  async get(): Promise<string | null> {
    return (await (await this.col()).findOne({ _id: "brand" }))?.hash ?? null;
  }

  async set(hash: string): Promise<void> {
    await (await this.col()).updateOne({ _id: "brand" }, { $set: { hash, at: new Date() } }, { upsert: true });
  }
}

export class InMemoryBrandFingerprint implements BrandFingerprintStore {
  private hash: string | null = null;
  async get(): Promise<string | null> {
    return this.hash;
  }
  async set(hash: string): Promise<void> {
    this.hash = hash;
  }
}
