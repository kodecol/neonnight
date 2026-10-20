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
  /**
   * El layout, la página y los metadatos lo leen en cada petición: se guarda
   * unos segundos en memoria y se renueva al guardar (una sola instancia).
   */
  private cache: { value: HomeSettings; at: number } | null = null;

  constructor(
    private readonly db: DbProvider,
    private readonly ttlMs = 10_000,
  ) {}

  private async col() {
    return (await this.db()).collection<HomeDoc>("settings");
  }

  async get(): Promise<HomeSettings> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const d = await (await this.col()).findOne({ _id: "home" });
    // Campos nuevos que un documento antiguo no tenga caen en el valor por defecto.
    const value: HomeSettings = d
      ? {
          hero: { ...DEFAULT_HOME_SETTINGS.hero, ...d.hero },
          band: { ...DEFAULT_HOME_SETTINGS.band, ...d.band },
          trust: d.trust ?? null,
          testimonials: d.testimonials ?? null,
          social: d.social ?? null,
          updatedAt: d.updatedAt,
        }
      : DEFAULT_HOME_SETTINGS;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async save(s: HomeSettings): Promise<void> {
    const { updatedAt, ...rest } = s;
    await (await this.col()).replaceOne({ _id: "home" }, { ...rest, updatedAt }, { upsert: true });
    this.cache = { value: s, at: Date.now() };
  }
}
