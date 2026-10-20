import { DEFAULT_HOME_SETTINGS, HOME_HISTORY_LIMIT, type HomeSettings, type HomeSettingsRepository } from "@/application/ports/home-settings";
import type { SiteMedia, SiteMediaRepository } from "@/application/ports/site-media";

export class InMemorySiteMediaRepository implements SiteMediaRepository {
  private readonly items = new Map<string, SiteMedia>();

  constructor(seed: readonly SiteMedia[] = []) {
    seed.forEach((m) => this.items.set(m.id, m));
  }

  async list(): Promise<readonly SiteMedia[]> {
    return [...this.items.values()];
  }

  async findById(id: string): Promise<SiteMedia | null> {
    return this.items.get(id) ?? null;
  }

  async save(media: SiteMedia): Promise<void> {
    this.items.set(media.id, media);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class InMemoryHomeSettingsRepository implements HomeSettingsRepository {
  private draft: HomeSettings | null = null;
  private past: HomeSettings[] = [];

  constructor(private settings: HomeSettings = DEFAULT_HOME_SETTINGS) {}

  async get(): Promise<HomeSettings> {
    return this.settings;
  }

  async getDraft(): Promise<HomeSettings | null> {
    return this.draft;
  }

  async saveDraft(settings: HomeSettings): Promise<void> {
    this.draft = settings;
  }

  async discardDraft(): Promise<void> {
    this.draft = null;
  }

  async publish(settings: HomeSettings): Promise<void> {
    // Lo nunca publicado (los textos del código) no entra al historial.
    if (this.settings.updatedAt) this.past = [this.settings, ...this.past].slice(0, HOME_HISTORY_LIMIT);
    this.settings = settings;
    this.draft = null;
  }

  async history(): Promise<readonly HomeSettings[]> {
    return this.past;
  }
}
