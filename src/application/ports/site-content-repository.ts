import type { SiteContent } from "../dto/site-content.dto";
import type { InfoPage, InfoPageSlug } from "../dto/info-page.dto";

export interface SiteContentRepository {
  get(): Promise<SiteContent>;
  /** Página institucional o legal; null si no existe. */
  page(slug: InfoPageSlug): Promise<InfoPage | null>;
}
