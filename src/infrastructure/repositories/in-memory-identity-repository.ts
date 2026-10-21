import { IDENTITY_HISTORY_LIMIT, type IdentitySettingsRepository, type StoreIdentity } from "@/application/ports/identity-settings";

export class InMemoryIdentitySettingsRepository implements IdentitySettingsRepository {
  private published: StoreIdentity | null = null;
  private draft: StoreIdentity | null = null;
  private past: StoreIdentity[] = [];

  async get(): Promise<StoreIdentity | null> {
    return this.published;
  }

  async getDraft(): Promise<StoreIdentity | null> {
    return this.draft;
  }

  async saveDraft(identity: StoreIdentity): Promise<void> {
    this.draft = identity;
  }

  async discardDraft(): Promise<void> {
    this.draft = null;
  }

  async publish(identity: StoreIdentity): Promise<void> {
    if (this.published) this.past = [this.published, ...this.past].slice(0, IDENTITY_HISTORY_LIMIT);
    this.published = identity;
    this.draft = null;
  }

  async history(): Promise<readonly StoreIdentity[]> {
    return this.past;
  }
}
