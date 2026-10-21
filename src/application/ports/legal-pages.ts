import type { InfoPageSlug } from "../dto/info-page.dto";

/**
 * Páginas legales editadas en el panel. Lo que nunca se publicó sigue el texto
 * de fábrica (el del código, versión 1.0).
 */
export interface LegalPageContent {
  readonly kicker: string;
  readonly title: string;
  readonly lead: string;
  readonly description: string;
  /** Markdown de la página, con fichas como {correo} (ver lib/legal-markdown). */
  readonly body: string;
}

export interface LegalPublished extends LegalPageContent {
  readonly version: string;
  readonly publishedAt: Date;
}

export interface LegalPageRecord {
  readonly slug: InfoPageSlug;
  readonly published: LegalPublished | null;
  readonly draft: (LegalPageContent & { readonly savedAt: Date }) | null;
  /** Versiones publicadas anteriores, la más reciente primero. */
  readonly history: readonly LegalPublished[];
}

export const LEGAL_HISTORY_LIMIT = 10;

export const emptyLegalRecord = (slug: InfoPageSlug): LegalPageRecord => ({ slug, published: null, draft: null, history: [] });

export interface LegalPagesRepository {
  /** Siempre devuelve un registro (vacío si la página nunca se editó). */
  get(slug: InfoPageSlug): Promise<LegalPageRecord>;
  list(): Promise<readonly LegalPageRecord[]>;
  saveDraft(slug: InfoPageSlug, draft: LegalPageContent & { savedAt: Date }): Promise<void>;
  discardDraft(slug: InfoPageSlug): Promise<void>;
  /** Publica, borra el borrador y guarda lo que estaba publicado en el historial. */
  publish(slug: InfoPageSlug, version: LegalPublished): Promise<void>;
  /** Vuelve al texto de fábrica; lo publicado pasa al historial. */
  reset(slug: InfoPageSlug): Promise<void>;
}

/** Aplica una publicación sobre un registro (la usan los repositorios). */
export function withPublished(r: LegalPageRecord, version: LegalPublished | null): LegalPageRecord {
  const history = [...(r.published ? [r.published] : []), ...r.history].slice(0, LEGAL_HISTORY_LIMIT);
  return { slug: r.slug, published: version, draft: null, history };
}
