import type { InfoPageSlug } from "@/application/dto/info-page.dto";
import { emptyLegalRecord, withPublished, type LegalPageContent, type LegalPageRecord, type LegalPagesRepository, type LegalPublished } from "@/application/ports/legal-pages";
import type { CompanySettings, CompanySettingsRepository } from "@/application/ports/company-settings";

export class InMemoryLegalPagesRepository implements LegalPagesRepository {
  private readonly records = new Map<InfoPageSlug, LegalPageRecord>();

  async get(slug: InfoPageSlug): Promise<LegalPageRecord> {
    return this.records.get(slug) ?? emptyLegalRecord(slug);
  }

  async list(): Promise<readonly LegalPageRecord[]> {
    return [...this.records.values()];
  }

  async saveDraft(slug: InfoPageSlug, draft: LegalPageContent & { savedAt: Date }): Promise<void> {
    this.records.set(slug, { ...(await this.get(slug)), draft });
  }

  async discardDraft(slug: InfoPageSlug): Promise<void> {
    this.records.set(slug, { ...(await this.get(slug)), draft: null });
  }

  async publish(slug: InfoPageSlug, version: LegalPublished): Promise<void> {
    this.records.set(slug, withPublished(await this.get(slug), version));
  }

  async reset(slug: InfoPageSlug): Promise<void> {
    this.records.set(slug, withPublished(await this.get(slug), null));
  }
}

export class InMemoryCompanySettingsRepository implements CompanySettingsRepository {
  constructor(private settings: CompanySettings | null = null) {}

  async get(): Promise<CompanySettings | null> {
    return this.settings;
  }

  async save(settings: CompanySettings): Promise<void> {
    this.settings = settings;
  }
}
