import type { InfoPageSlug } from "@/application/dto/info-page.dto";
import { emptyLegalRecord, withPublished, type LegalPageContent, type LegalPageRecord, type LegalPagesRepository, type LegalPublished } from "@/application/ports/legal-pages";
import type { CompanySettings, CompanySettingsRepository } from "@/application/ports/company-settings";
import type { DbProvider } from "./client";

type LegalDoc = Omit<LegalPageRecord, "slug"> & { _id: InfoPageSlug };

/**
 * Páginas legales editadas (colección `legal_pages`, un documento por página).
 * Las páginas públicas las leen en cada petición: se guardan unos segundos en
 * memoria y se renuevan al escribir (una sola instancia).
 */
export class MongoLegalPagesRepository implements LegalPagesRepository {
  private cache: { value: Map<InfoPageSlug, LegalPageRecord>; at: number } | null = null;

  constructor(
    private readonly db: DbProvider,
    private readonly ttlMs = 10_000,
  ) {}

  private async col() {
    return (await this.db()).collection<LegalDoc>("legal_pages");
  }

  private async all(): Promise<Map<InfoPageSlug, LegalPageRecord>> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const docs = await (await this.col()).find().toArray();
    const value = new Map(docs.map(({ _id, ...d }) => [_id, { slug: _id, published: d.published ?? null, draft: d.draft ?? null, history: d.history ?? [] }] as const));
    this.cache = { value, at: Date.now() };
    return value;
  }

  private async write(r: LegalPageRecord): Promise<void> {
    const { slug, ...doc } = r;
    await (await this.col()).replaceOne({ _id: slug }, doc, { upsert: true });
    this.cache = null;
  }

  async get(slug: InfoPageSlug): Promise<LegalPageRecord> {
    return (await this.all()).get(slug) ?? emptyLegalRecord(slug);
  }

  async list(): Promise<readonly LegalPageRecord[]> {
    return [...(await this.all()).values()];
  }

  async saveDraft(slug: InfoPageSlug, draft: LegalPageContent & { savedAt: Date }): Promise<void> {
    this.cache = null;
    await this.write({ ...(await this.get(slug)), draft });
  }

  async discardDraft(slug: InfoPageSlug): Promise<void> {
    this.cache = null;
    await this.write({ ...(await this.get(slug)), draft: null });
  }

  async publish(slug: InfoPageSlug, version: LegalPublished): Promise<void> {
    this.cache = null;
    await this.write(withPublished(await this.get(slug), version));
  }

  async reset(slug: InfoPageSlug): Promise<void> {
    this.cache = null;
    await this.write(withPublished(await this.get(slug), null));
  }
}

type CompanyDoc = CompanySettings & { _id: "company" };

/** Datos de la empresa en la colección `settings` (junto a pagos e inicio). */
export class MongoCompanySettingsRepository implements CompanySettingsRepository {
  private cache: { value: CompanySettings | null; at: number } | null = null;

  constructor(
    private readonly db: DbProvider,
    private readonly ttlMs = 10_000,
  ) {}

  private async col() {
    return (await this.db()).collection<CompanyDoc>("settings");
  }

  async get(): Promise<CompanySettings | null> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const value = (await (await this.col()).findOne({ _id: "company" }, { projection: { _id: 0 } })) as CompanySettings | null;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async save(s: CompanySettings): Promise<void> {
    await (await this.col()).replaceOne({ _id: "company" }, s, { upsert: true });
    this.cache = { value: s, at: Date.now() };
  }
}
