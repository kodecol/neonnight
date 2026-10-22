import type { SiteContent } from "../dto/site-content.dto";
import type { StoreIdentityInput } from "../dto/identity.dto";

/** Identidad publicada o en borrador (ver `StoreIdentitySchema`). */
export interface StoreIdentity extends StoreIdentityInput {
  readonly updatedAt: Date;
}

export const IDENTITY_HISTORY_LIMIT = 10;

/** Igual que Inicio: lo publicado, un borrador para la vista previa y las últimas publicaciones. */
export interface IdentitySettingsRepository {
  /** Lo publicado; null: la identidad del código. */
  get(): Promise<StoreIdentity | null>;
  getDraft(): Promise<StoreIdentity | null>;
  saveDraft(identity: StoreIdentity): Promise<void>;
  discardDraft(): Promise<void>;
  /** Publica, borra el borrador y guarda lo que estaba publicado en el historial. */
  publish(identity: StoreIdentity): Promise<void>;
  /** Versiones anteriores, la más reciente primero. */
  history(): Promise<readonly StoreIdentity[]>;
}

/** La marca que usa el sitio: la del código con la identidad editada encima. */
export function mergeIdentity(base: SiteContent["brand"], s: StoreIdentityInput | null): SiteContent["brand"] {
  if (!s) return base;
  return { ...base, name: s.name, wordmark: s.wordmark, tagline: s.tagline, titleSuffix: s.titleSuffix || base.titleSuffix, description: s.description, isotype: s.isotype, logoWide: s.logo, logo: { ...base.logo, color: s.lightLogo?.src ?? s.isotype?.src ?? base.logo.color } };
}

/** La identidad del código como entrada del editor. */
export function identityOf(brand: SiteContent["brand"]): StoreIdentityInput {
  return { name: brand.name, wordmark: brand.wordmark, tagline: brand.tagline, titleSuffix: brand.titleSuffix, description: brand.description, isotype: brand.isotype ?? null, logo: brand.logoWide ?? null, lightLogo: null };
}

/**
 * Los textos del código escriben `{tienda}` donde va el nombre de la tienda
 * (pie de página, avisos, mensajes): se rellena con el nombre vigente.
 */
export function fillStoreName<T>(value: T, name: string): T {
  if (typeof value === "string") return value.split("{tienda}").join(name) as T;
  if (Array.isArray(value)) return value.map((v) => fillStoreName(v, name)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillStoreName(v, name)])) as T;
  }
  return value;
}
