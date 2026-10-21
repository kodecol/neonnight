import type { CompanyInfo, SiteContent, StorePolicies } from "@/application/dto/site-content.dto";
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
  /** WhatsApp con formato legible ("+57 300 …") o null. */
  readonly whatsapp: string | null;
  private memo: { key: string; pages: Record<InfoPageSlug, InfoPage> } | null = null;

  constructor(
    private readonly content: SiteContent = SITE_CONTENT,
    whatsappNumber: string | null = null,
  ) {
    this.whatsapp = formatWhatsapp(whatsappNumber);
    this.pages = buildInfoPages({ company: content.company, policies: content.policies, whatsapp: this.whatsapp });
  }

  /** Las páginas de código redactadas con otros datos de empresa o de envío (los editados en el panel). */
  pagesFor(company: CompanyInfo, policies: StorePolicies = this.content.policies): Record<InfoPageSlug, InfoPage> {
    const key = JSON.stringify([company, policies]);
    if (key === JSON.stringify([this.content.company, this.content.policies])) return this.pages;
    if (this.memo?.key !== key) this.memo = { key, pages: buildInfoPages({ company, policies, whatsapp: this.whatsapp }) };
    return this.memo.pages;
  }

  async get(): Promise<SiteContent> {
    return this.content;
  }

  async page(slug: InfoPageSlug): Promise<InfoPage | null> {
    return this.pages[slug] ?? null;
  }
}
