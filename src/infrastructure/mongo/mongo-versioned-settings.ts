import { SETTINGS_HISTORY_LIMIT, type Versioned, type VersionedSettingsRepository } from "@/application/ports/versioned-settings";
import type { DbProvider } from "./client";

interface VersionedDoc<T> {
  _id: string;
  published: T | null;
  draft: T | null;
  history: T[];
}

/**
 * Ajuste versionado en la colección `settings` (`_id` propio): publicado,
 * borrador e historial en un documento. Lo publicado se lee en cada petición:
 * se guarda unos segundos en memoria y se renueva al publicar.
 */
export class MongoVersionedSettings<T extends Versioned> implements VersionedSettingsRepository<T> {
  private cache: { value: T | null; at: number } | null = null;

  constructor(
    private readonly db: DbProvider,
    private readonly id: string,
    /** Deja solo los campos conocidos (no guarda nada de más). */
    private readonly clean: (value: T) => T,
    private readonly ttlMs = 10_000,
  ) {}

  private async col() {
    return (await this.db()).collection<VersionedDoc<T>>("settings");
  }

  private async doc(): Promise<VersionedDoc<T> | null> {
    return (await this.col()).findOne({ _id: this.id }) as Promise<VersionedDoc<T> | null>;
  }

  async get(): Promise<T | null> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const value = (await this.doc())?.published ?? null;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async getDraft(): Promise<T | null> {
    return (await this.doc())?.draft ?? null;
  }

  async saveDraft(value: T): Promise<void> {
    await (await this.col()).updateOne({ _id: this.id }, { $set: { draft: this.clean(value) }, $setOnInsert: { published: null, history: [] } } as never, { upsert: true });
  }

  async discardDraft(): Promise<void> {
    await (await this.col()).updateOne({ _id: this.id }, { $set: { draft: null } } as never);
  }

  async publish(value: T): Promise<void> {
    const d = await this.doc();
    const history = [...(d?.published ? [d.published] : []), ...(d?.history ?? [])].slice(0, SETTINGS_HISTORY_LIMIT);
    await (await this.col()).replaceOne({ _id: this.id }, { published: this.clean(value), draft: null, history } as never, { upsert: true });
    this.cache = { value: this.clean(value), at: Date.now() };
  }

  async history(): Promise<readonly T[]> {
    return (await this.doc())?.history ?? [];
  }
}
