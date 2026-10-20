import type { SiteContent } from "@/application/dto/site-content.dto";
import type { InfoPage, InfoPageSlug } from "@/application/dto/info-page.dto";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import type { HomeSettingsRepository } from "@/application/ports/home-settings";
import { mergeSiteContent } from "@/application/lib/merge-site-content";

/**
 * Contenido del sitio = el del código + lo editado en el panel › Inicio.
 * Si la base no responde, el sitio sigue con el contenido del código.
 */
export class ManagedSiteContentRepository implements SiteContentRepository {
  constructor(
    private readonly base: SiteContentRepository,
    private readonly settings: HomeSettingsRepository,
  ) {}

  async get(): Promise<SiteContent> {
    const [content, settings] = await Promise.all([this.base.get(), this.settings.get().catch(() => null)]);
    return settings ? mergeSiteContent(content, settings) : content;
  }

  page(slug: InfoPageSlug): Promise<InfoPage | null> {
    return this.base.page(slug);
  }
}
