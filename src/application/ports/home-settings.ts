/**
 * Contenido editable de la página de inicio. Lo que queda en null usa el texto
 * por defecto de `SiteContent` (el sitio nunca queda vacío).
 */
export type HeroSource = "featured" | "media";

export type SocialNetworkKey = "instagram" | "facebook" | "tiktok" | "youtube";

/** Bloques de la home que se pueden reordenar u ocultar (el hero va siempre primero). */
export const HOME_BLOCKS = {
  marcas: "Marcas",
  lineas: "Líneas",
  seleccion: "Selección de piezas",
  banda: "Banda",
  garantia: "Garantía y autenticidad",
  testimonios: "Testimonios",
  movimiento: "En movimiento",
  pagos: "Métodos de pago",
  redes: "Redes",
} as const;
export type HomeBlockId = keyof typeof HOME_BLOCKS;
export const HOME_BLOCK_IDS = Object.keys(HOME_BLOCKS) as HomeBlockId[];
export type HomeLayout = ReadonlyArray<{ readonly id: HomeBlockId; readonly visible: boolean }>;

/** Orden completo: el guardado, sin ids desconocidos ni repetidos, y lo que falte al final y visible. */
export function resolveLayout(layout: HomeLayout | null | undefined): HomeLayout {
  const seen = new Set<HomeBlockId>();
  const out: Array<{ id: HomeBlockId; visible: boolean }> = [];
  for (const b of layout ?? []) {
    if (!(b.id in HOME_BLOCKS) || seen.has(b.id)) continue;
    seen.add(b.id);
    out.push({ id: b.id, visible: b.visible });
  }
  for (const id of HOME_BLOCK_IDS) if (!seen.has(id)) out.push({ id, visible: true });
  return out;
}

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
  /** Orden y visibilidad de los bloques. null: el orden de siempre, todo visible. */
  readonly layout: HomeLayout | null;
  readonly updatedAt: Date | null;
}

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  hero: { source: "featured", mediaId: null, kicker: null, title: null, text: null, ctaLabel: null, ctaHref: null },
  band: { mediaId: null, title: null, position: null },
  trust: null,
  testimonials: null,
  social: null,
  layout: null,
  updatedAt: null,
};

/** Versiones publicadas que se guardan para volver atrás. */
export const HOME_HISTORY_LIMIT = 10;

/** Ids de medios que usa la home (publicada y borrador): no se pueden borrar de la biblioteca. */
export function mediaInUse(...versions: ReadonlyArray<HomeSettings | null>): Map<string, string[]> {
  const uses = new Map<string, string[]>();
  const add = (id: string | null, where: string) => {
    if (!id) return;
    const list = uses.get(id) ?? [];
    if (!list.includes(where)) uses.set(id, [...list, where]);
  };
  for (const s of versions) {
    if (!s) continue;
    if (s.hero.source === "media") add(s.hero.mediaId, "Hero");
    add(s.band.mediaId, "Banda");
  }
  return uses;
}

/**
 * Contenido publicado, un borrador para la vista previa y las últimas
 * versiones publicadas.
 */
export interface HomeSettingsRepository {
  /** Lo publicado (lo que ve la tienda). */
  get(): Promise<HomeSettings>;
  getDraft(): Promise<HomeSettings | null>;
  saveDraft(settings: HomeSettings): Promise<void>;
  discardDraft(): Promise<void>;
  /** Publica, borra el borrador y guarda lo que estaba publicado en el historial. */
  publish(settings: HomeSettings): Promise<void>;
  /** Versiones anteriores, la más reciente primero. */
  history(): Promise<readonly HomeSettings[]>;
}
