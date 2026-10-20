import { DEFAULT_HOME_SETTINGS, type HomeSettings, type HomeSettingsRepository } from "@/application/ports/home-settings";
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
  constructor(private settings: HomeSettings = DEFAULT_HOME_SETTINGS) {}

  async get(): Promise<HomeSettings> {
    return this.settings;
  }

  async save(settings: HomeSettings): Promise<void> {
    this.settings = settings;
  }
}
