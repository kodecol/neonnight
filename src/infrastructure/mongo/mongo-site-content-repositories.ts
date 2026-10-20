import { DEFAULT_HOME_SETTINGS, HOME_HISTORY_LIMIT, type HomeSettings, type HomeSettingsRepository } from "@/application/ports/home-settings";
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

type StoredSettings = Omit<HomeSettings, "updatedAt"> & { updatedAt: Date | null };

interface HomeDoc extends StoredSettings {
  _id: "home";
  /** Borrador de la vista previa (null: no hay). */
  draft?: StoredSettings | null;
  /** Versiones publicadas anteriores, la más reciente primero. */
  history?: StoredSettings[];
}

/** Completa lo que un documento antiguo no tenga con los valores por defecto. */
function normalize(d: Partial<StoredSettings> | null | undefined): HomeSettings | null {
  if (!d) return null;
  return {
    hero: { ...DEFAULT_HOME_SETTINGS.hero, ...d.hero },
    band: { ...DEFAULT_HOME_SETTINGS.band, ...d.band },
    trust: d.trust ?? null,
    testimonials: d.testimonials ?? null,
    social: d.social ?? null,
    layout: d.layout ?? null,
    updatedAt: d.updatedAt ?? null,
  };
}

const stored = (s: HomeSettings): StoredSettings => ({ hero: s.hero, band: s.band, trust: s.trust, testimonials: s.testimonials, social: s.social, layout: s.layout, updatedAt: s.updatedAt });

/**
 * Contenido de la home en la colección `settings` (junto a la configuración de
 * pagos): lo publicado, el borrador y el historial en un solo documento.
 */
export class MongoHomeSettingsRepository implements HomeSettingsRepository {
  /**
   * El layout, la página y los metadatos leen lo publicado en cada petición:
   * se guarda unos segundos en memoria y se renueva al publicar (una sola instancia).
   */
  private cache: { value: HomeSettings; at: number } | null = null;

  constructor(
    private readonly db: DbProvider,
    private readonly ttlMs = 10_000,
  ) {}

  private async col() {
    return (await this.db()).collection<HomeDoc>("settings");
  }

  private async doc(): Promise<HomeDoc | null> {
    return (await this.col()).findOne({ _id: "home" });
  }

  async get(): Promise<HomeSettings> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const value = normalize(await this.doc()) ?? DEFAULT_HOME_SETTINGS;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async getDraft(): Promise<HomeSettings | null> {
    return normalize((await this.doc())?.draft);
  }

  async saveDraft(s: HomeSettings): Promise<void> {
    const d = await this.doc();
    // Sin documento todavía: lo publicado son los valores por defecto.
    if (!d) await (await this.col()).insertOne({ _id: "home", ...stored(DEFAULT_HOME_SETTINGS), draft: stored(s), history: [] });
    else await (await this.col()).updateOne({ _id: "home" }, { $set: { draft: stored(s) } });
  }

  async discardDraft(): Promise<void> {
    await (await this.col()).updateOne({ _id: "home" }, { $set: { draft: null } });
  }

  async publish(s: HomeSettings): Promise<void> {
    const d = await this.doc();
    const current = normalize(d);
    const history = [...(current?.updatedAt ? [stored(current)] : []), ...(d?.history ?? [])].slice(0, HOME_HISTORY_LIMIT);
    await (await this.col()).replaceOne({ _id: "home" }, { ...stored(s), draft: null, history }, { upsert: true });
    this.cache = { value: s, at: Date.now() };
  }

  async history(): Promise<readonly HomeSettings[]> {
    return ((await this.doc())?.history ?? []).map((h) => normalize(h)!);
  }
}
