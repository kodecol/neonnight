import { IDENTITY_HISTORY_LIMIT, type IdentitySettingsRepository, type StoreIdentity } from "@/application/ports/identity-settings";
import type { DbProvider } from "./client";

interface BrandDoc {
  _id: "brand";
  published: StoreIdentity | null;
  draft: StoreIdentity | null;
  /** Publicaciones anteriores, la más reciente primero. */
  history: StoreIdentity[];
}

const clean = (s: StoreIdentity): StoreIdentity => ({
  name: s.name,
  wordmark: s.wordmark,
  tagline: s.tagline,
  ...(s.titleSuffix ? { titleSuffix: s.titleSuffix } : {}),
  description: s.description,
  isotype: s.isotype,
  logo: s.logo,
  ...(s.lightLogo ? { lightLogo: s.lightLogo } : {}),
  updatedAt: s.updatedAt,
});

/**
 * Identidad de la tienda en `settings` (_id "brand"): lo publicado, el
 * borrador y el historial. Lo publicado se lee en cada petición (layout,
 * metadatos): se guarda unos segundos en memoria y se renueva al publicar.
 */
export class MongoIdentitySettingsRepository implements IdentitySettingsRepository {
  private cache: { value: StoreIdentity | null; at: number } | null = null;

  constructor(
    private readonly db: DbProvider,
    private readonly ttlMs = 10_000,
  ) {}

  private async col() {
    return (await this.db()).collection<BrandDoc>("settings");
  }

  private async doc(): Promise<BrandDoc | null> {
    return (await this.col()).findOne({ _id: "brand" });
  }

  async get(): Promise<StoreIdentity | null> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const value = (await this.doc())?.published ?? null;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async getDraft(): Promise<StoreIdentity | null> {
    return (await this.doc())?.draft ?? null;
  }

  async saveDraft(identity: StoreIdentity): Promise<void> {
    await (await this.col()).updateOne({ _id: "brand" }, { $set: { draft: clean(identity) }, $setOnInsert: { published: null, history: [] } }, { upsert: true });
  }

  async discardDraft(): Promise<void> {
    await (await this.col()).updateOne({ _id: "brand" }, { $set: { draft: null } });
  }

  async publish(identity: StoreIdentity): Promise<void> {
    const d = await this.doc();
    const history = [...(d?.published ? [d.published] : []), ...(d?.history ?? [])].slice(0, IDENTITY_HISTORY_LIMIT);
    await (await this.col()).replaceOne({ _id: "brand" }, { published: clean(identity), draft: null, history }, { upsert: true });
    this.cache = { value: clean(identity), at: Date.now() };
  }

  async history(): Promise<readonly StoreIdentity[]> {
    return (await this.doc())?.history ?? [];
  }
}
