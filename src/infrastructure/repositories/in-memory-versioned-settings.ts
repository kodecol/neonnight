import { SETTINGS_HISTORY_LIMIT, type Versioned, type VersionedSettingsRepository } from "@/application/ports/versioned-settings";

export class InMemoryVersionedSettings<T extends Versioned> implements VersionedSettingsRepository<T> {
  private published: T | null = null;
  private draft: T | null = null;
  private past: T[] = [];

  async get(): Promise<T | null> {
    return this.published;
  }

  async getDraft(): Promise<T | null> {
    return this.draft;
  }

  async saveDraft(value: T): Promise<void> {
    this.draft = value;
  }

  async discardDraft(): Promise<void> {
    this.draft = null;
  }

  async publish(value: T): Promise<void> {
    if (this.published) this.past = [this.published, ...this.past].slice(0, SETTINGS_HISTORY_LIMIT);
    this.published = value;
    this.draft = null;
  }

  async history(): Promise<readonly T[]> {
    return this.past;
  }
}
