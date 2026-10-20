/**
 * Contenido editable de la página de inicio. Lo que queda en null usa el texto
 * por defecto de `SiteContent` (el sitio nunca queda vacío).
 */
export type HeroSource = "featured" | "media";

export type SocialNetworkKey = "instagram" | "facebook" | "tiktok" | "youtube";

export interface ManagedTestimonial {
  readonly id: string;
  readonly quote: string;
  readonly name: string;
  readonly city: string;
  readonly piece: string;
  /** 1–5 */
  readonly rating: number;
  /** El cliente autorizó por escrito publicar su testimonio (Ley 1480: la publicidad no puede inducir a error). */
  readonly authorized: boolean;
  readonly visible: boolean;
}

export interface HomeSettings {
  readonly hero: {
    /** `featured`: la pieza destacada del catálogo. `media`: una foto o video de la biblioteca. */
    readonly source: HeroSource;
    readonly mediaId: string | null;
    readonly kicker: string | null;
    readonly title: string | null;
    readonly text: string | null;
    readonly ctaLabel: string | null;
    /** Ruta interna ("/coleccion/relojeria"). */
    readonly ctaHref: string | null;
  };
  readonly band: {
    readonly mediaId: string | null;
    readonly title: string | null;
    /** `object-position` del recorte ("50% 22%"). */
    readonly position: string | null;
  };
  /** Compromisos de "Garantía y autenticidad" (siempre 3). null: los del código. */
  readonly trust: { readonly kicker: string | null; readonly items: ReadonlyArray<{ readonly title: string; readonly body: string }> } | null;
  /** null: los del código. Solo se publican los visibles y autorizados. */
  readonly testimonials: { readonly kicker: string | null; readonly title: string | null; readonly note: string | null; readonly items: readonly ManagedTestimonial[] } | null;
  /** null: los del código. Las redes desactivadas desaparecen de la home, el menú y el pie de página. */
  readonly social: {
    readonly kicker: string | null;
    readonly title: string | null;
    readonly body: string | null;
    readonly networks: ReadonlyArray<{ readonly id: SocialNetworkKey; readonly enabled: boolean; readonly handle: string; readonly href: string; readonly description: string }>;
  } | null;
  readonly updatedAt: Date | null;
}

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  hero: { source: "featured", mediaId: null, kicker: null, title: null, text: null, ctaLabel: null, ctaHref: null },
  band: { mediaId: null, title: null, position: null },
  trust: null,
  testimonials: null,
  social: null,
  updatedAt: null,
};

/** Ids de medios que usa la home: no se pueden borrar de la biblioteca. */
export function mediaInUse(s: HomeSettings): Map<string, string[]> {
  const uses = new Map<string, string[]>();
  const add = (id: string | null, where: string) => id && uses.set(id, [...(uses.get(id) ?? []), where]);
  if (s.hero.source === "media") add(s.hero.mediaId, "Hero");
  add(s.band.mediaId, "Banda");
  return uses;
}

export interface HomeSettingsRepository {
  get(): Promise<HomeSettings>;
  save(settings: HomeSettings): Promise<void>;
}
