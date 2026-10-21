import { DEFAULT_APPEARANCE } from "../dto/appearance.dto";
import type { IdentityAsset } from "../dto/identity.dto";
import type { AppearanceSettingsRepository } from "../ports/appearance-settings";
import type { IdentitySettingsRepository } from "../ports/identity-settings";
import type { SiteContentRepository } from "../ports/site-content-repository";
import { GetActiveAppearance } from "./admin/appearance";

/** Lo que necesitan el favicon, los íconos, el manifest y las vistas previas. */
export interface BrandAssets {
  /**
   * Cambia con cada publicación de Identidad o Apariencia ("" si no hay nada
   * publicado). Va en las URLs (`?v=`) para que navegadores, proxies y redes
   * sociales pidan la versión nueva justo al publicar.
   */
  version: string;
  /** true: sirven los íconos del sitio tal cual (sin isotipo propio y con el fondo de fábrica). */
  factoryIcons: boolean;
  name: string;
  /** Nombre bajo el ícono en la pantalla de inicio (12 caracteres como mucho). */
  shortName: string;
  description: string;
  locale: string;
  /** Isotipo de Identidad; null: el del sitio. */
  isotype: IdentityAsset | null;
  /** Fondo de los íconos y `background_color` / `theme_color` del manifest. */
  bg: string;
}

const SHORT_NAME_MAX = 12;

/** El nombre si cabe; si no, el wordmark; si tampoco, la primera palabra recortada. */
export function shortNameOf(name: string, wordmark: string): string {
  if (name.length <= SHORT_NAME_MAX) return name;
  if (wordmark.length <= SHORT_NAME_MAX) return wordmark;
  return (name.split(/\s+/)[0] ?? name).slice(0, SHORT_NAME_MAX);
}

export class GetBrandAssets {
  constructor(private readonly deps: { content: SiteContentRepository; identity: IdentitySettingsRepository; appearance: AppearanceSettingsRepository }) {}

  async execute(): Promise<BrandAssets> {
    const [{ brand }, identity, appearance, active] = await Promise.all([
      this.deps.content.get(),
      this.deps.identity.get().catch(() => null),
      this.deps.appearance.get().catch(() => null),
      // El color, de la apariencia revalidada con su esquema: va al manifest y a los íconos sin más revisión.
      new GetActiveAppearance(this.deps.appearance).execute(),
    ]);
    // Cada publicación lleva la hora del momento: la mayor basta como versión.
    const published = Math.max(identity?.updatedAt.getTime() ?? 0, appearance?.updatedAt.getTime() ?? 0);
    const bg = (active?.colors.bg ?? DEFAULT_APPEARANCE.colors.bg).toLowerCase();
    const isotype = brand.isotype ?? null;
    return {
      version: published > 0 ? published.toString(36) : "",
      factoryIcons: !isotype && bg === DEFAULT_APPEARANCE.colors.bg.toLowerCase(),
      name: brand.name,
      shortName: shortNameOf(brand.name, brand.wordmark),
      description: brand.description,
      locale: brand.locale,
      isotype,
      bg,
    };
  }
}

/** `?v=<versión>` para las URLs de íconos, manifest y vistas previas ("" sin nada publicado). */
export const versioned = (path: string, version: string) => (version ? `${path}${path.includes("?") ? "&" : "?"}v=${version}` : path);
