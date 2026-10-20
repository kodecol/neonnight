import { DEFAULT_HOME_SETTINGS, type HomeSettings, type HomeSettingsRepository } from "@/application/ports/home-settings";
import type { SiteMedia, SiteMediaRepository } from "@/application/ports/site-media";
import type { DbProvider } from "./client";

type SiteMediaDoc = Omit<SiteMedia, "id"> & { _id: string };

/** Biblioteca de medios del sitio (colección `site_media`). */
export class MongoSiteMediaRepository implements SiteMediaRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<SiteMediaDoc>("site_media");
  }

  async list(): Promise<readonly SiteMedia[]> {
    return (await (await this.col()).find().sort({ createdAt: -1 }).toArray()).map(({ _id, ...m }) => ({ id: _id, ...m }));
  }

  async findById(id: string): Promise<SiteMedia | null> {
    const d = await (await this.col()).findOne({ _id: id });
    if (!d) return null;
    const { _id, ...m } = d;
    return { id: _id, ...m };
  }

  async save({ id, ...m }: SiteMedia): Promise<void> {
    await (await this.col()).replaceOne({ _id: id }, m, { upsert: true });
  }

  async delete(id: string): Promise<void> {
    await (await this.col()).deleteOne({ _id: id });
  }
}

interface HomeDoc extends Omit<HomeSettings, "updatedAt"> {
  _id: "home";
  updatedAt: Date | null;
}

/** Contenido de la home en la colección `settings` (junto a la configuración de pagos). */
export class MongoHomeSettingsRepository implements HomeSettingsRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<HomeDoc>("settings");
  }

  async get(): Promise<HomeSettings> {
    const d = await (await this.col()).findOne({ _id: "home" });
    if (!d) return DEFAULT_HOME_SETTINGS;
    // Campos nuevos que un documento antiguo no tenga caen en el valor por defecto.
    return {
      hero: { ...DEFAULT_HOME_SETTINGS.hero, ...d.hero },
      band: { ...DEFAULT_HOME_SETTINGS.band, ...d.band },
      updatedAt: d.updatedAt,
    };
  }

  async save(s: HomeSettings): Promise<void> {
    await (await this.col()).replaceOne({ _id: "home" }, { hero: s.hero, band: s.band, updatedAt: s.updatedAt }, { upsert: true });
  }
}
