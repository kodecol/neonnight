import type { SiteContent } from "../dto/site-content.dto";
import type { HomeSettings } from "./home-settings";
import type { StoreIdentityInput } from "../dto/identity.dto";
import type { InfoPage, InfoPageSlug } from "../dto/info-page.dto";

export interface SiteContentRepository {
  /**
   * `home` / `identity`: otros ajustes de Inicio o de Identidad que aplicar (la
   * vista previa del borrador); sin ellos, los publicados.
   */
  get(options?: { home?: HomeSettings; identity?: StoreIdentityInput }): Promise<SiteContent>;
  /** Página institucional o legal; null si no existe. */
  page(slug: InfoPageSlug): Promise<InfoPage | null>;
}
