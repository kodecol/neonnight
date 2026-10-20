/**
 * Contenido editable de la página de inicio. Lo que queda en null usa el texto
 * por defecto de `SiteContent` (el sitio nunca queda vacío).
 */
export type HeroSource = "featured" | "media";

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
  readonly updatedAt: Date | null;
}

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  hero: { source: "featured", mediaId: null, kicker: null, title: null, text: null, ctaLabel: null, ctaHref: null },
  band: { mediaId: null, title: null, position: null },
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
