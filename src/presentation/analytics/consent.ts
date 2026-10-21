import { storeKey } from "@/presentation/lib/store-key";
/**
 * Consentimiento de cookies (Ley 1581 de 2012): nada de analítica ni
 * publicidad se carga sin una elección expresa. La elección vive en el
 * navegador y caduca a los 12 meses, como dice la política de privacidad.
 */
/** Clave en localStorage (con el slug de la tienda). */
export const consentKey = () => storeKey("consent.v1");
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
/** Se emite al guardar una elección (`detail`: Consent). */
export const CONSENT_EVENT = "tienda:consent";
/** Pide reabrir el banner (enlace "Preferencias de cookies"). */
export const OPEN_PREFERENCES_EVENT = "tienda:consent-open";

export interface Consent {
  analytics: boolean;
  marketing: boolean;
  /** ISO de cuándo se eligió. */
  at: string;
}

/** Valida lo guardado; null si no hay elección, está corrupta o caducó. */
export function parseConsent(raw: string | null, now: number = Date.now()): Consent | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { analytics, marketing, at } = v as Record<string, unknown>;
    if (typeof analytics !== "boolean" || typeof marketing !== "boolean" || typeof at !== "string") return null;
    const time = Date.parse(at);
    if (Number.isNaN(time) || now - time > CONSENT_MAX_AGE_MS || time - now > 60_000) return null;
    return { analytics, marketing, at };
  } catch {
    return null;
  }
}

export function readConsent(): Consent | null {
  try {
    return parseConsent(window.localStorage.getItem(consentKey()));
  } catch {
    return null;
  }
}

export function saveConsent(choice: Pick<Consent, "analytics" | "marketing">): Consent {
  const consent: Consent = { ...choice, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(consentKey(), JSON.stringify(consent));
  } catch {
    /* sin almacenamiento: la elección vale solo para esta visita */
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  return consent;
}

export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}
