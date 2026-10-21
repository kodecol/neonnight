import type { SiteContent } from "../dto/site-content.dto";
import type { HomeSettings } from "./home-settings";
import type { InfoPage, InfoPageSlug } from "../dto/info-page.dto";

export interface SiteContentRepository {
  /** `home`: otros ajustes de Inicio que aplicar (la vista previa del borrador); sin él, los publicados. */
  get(options?: { home?: HomeSettings }): Promise<SiteContent>;
  /** Página institucional o legal; null si no existe. */
  page(slug: InfoPageSlug): Promise<InfoPage | null>;
}
