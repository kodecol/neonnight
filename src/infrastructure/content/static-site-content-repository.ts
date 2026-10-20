import type { SiteContent } from "@/application/dto/site-content.dto";
import type { InfoPage, InfoPageSlug } from "@/application/dto/info-page.dto";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import { SITE_CONTENT } from "./site-content";
import { buildInfoPages } from "./pages";

/** "573001234567" → "+57 300 123 4567"; otros formatos se muestran tal cual con "+". */
export function formatWhatsapp(number: string | undefined | null): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const m = /^57(\d{3})(\d{3})(\d{4})$/.exec(digits);
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

export class StaticSiteContentRepository implements SiteContentRepository {
  private readonly pages: Record<InfoPageSlug, InfoPage>;

  constructor(
    private readonly content: SiteContent = SITE_CONTENT,
    whatsappNumber: string | null = null,
  ) {
    this.pages = buildInfoPages({ company: content.company, policies: content.policies, whatsapp: formatWhatsapp(whatsappNumber) });
  }

  async get(): Promise<SiteContent> {
    return this.content;
  }

  async page(slug: InfoPageSlug): Promise<InfoPage | null> {
    return this.pages[slug] ?? null;
  }
}
