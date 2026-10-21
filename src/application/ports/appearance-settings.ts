import type { StoreAppearanceInput } from "../dto/appearance.dto";
import type { VersionedSettingsRepository } from "./versioned-settings";

export interface StoreAppearance extends StoreAppearanceInput {
  readonly updatedAt: Date;
}

export type AppearanceSettingsRepository = VersionedSettingsRepository<StoreAppearance>;
