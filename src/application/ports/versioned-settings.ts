/**
 * Ajuste con borrador, publicación e historial (Identidad, Apariencia…):
 * lo publicado lo ve la tienda; el borrador, solo la vista previa del panel.
 */
export interface Versioned {
  readonly updatedAt: Date;
}

export const SETTINGS_HISTORY_LIMIT = 10;

export interface VersionedSettingsRepository<T extends Versioned> {
  /** Lo publicado; null: lo del código. */
  get(): Promise<T | null>;
  getDraft(): Promise<T | null>;
  saveDraft(value: T): Promise<void>;
  discardDraft(): Promise<void>;
  /** Publica, borra el borrador y guarda lo que estaba publicado en el historial. */
  publish(value: T): Promise<void>;
  /** Versiones anteriores, la más reciente primero. */
  history(): Promise<readonly T[]>;
}
