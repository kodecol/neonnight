import type { CompanyInfo, SiteContent, StorePolicies } from "@/application/dto/site-content.dto";
import type { InfoPage, InfoPageSlug } from "@/application/dto/info-page.dto";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import type { HomeSettings, HomeSettingsRepository } from "@/application/ports/home-settings";
import type { LegalPagesRepository } from "@/application/ports/legal-pages";
import { mergeCompany, mergeShipping, type CompanySettingsRepository } from "@/application/ports/company-settings";
import { mergeSiteContent } from "@/application/lib/merge-site-content";
import { colombiaDate, tokenValues } from "@/application/lib/legal-markdown";
import { legalInfoPage } from "@/application/use-cases/admin/legal";

export interface ManagedLegal {
  pages: LegalPagesRepository;
  company: CompanySettingsRepository;
  /** Páginas de código redactadas con unos datos de empresa y unas políticas dados. */
  codePages: (company: CompanyInfo, policies: StorePolicies) => Record<InfoPageSlug, InfoPage>;
  /** WhatsApp con formato legible, para la ficha {whatsapp}. */
  whatsapp: string | null;
}

/**
 * Contenido del sitio = el del código + lo editado en el panel (Inicio,
 * datos de la empresa y páginas legales publicadas). Si la base no responde,
 * el sitio sigue con el contenido del código.
 */
export class ManagedSiteContentRepository implements SiteContentRepository {
  constructor(
    private readonly base: SiteContentRepository,
    private readonly settings: HomeSettingsRepository,
    private readonly legal?: ManagedLegal,
  ) {}

  /** `home`: otros ajustes de Inicio (la vista previa del borrador); sin él, los publicados. */
  async get(options: { home?: HomeSettings } = {}): Promise<SiteContent> {
    const [content, settings, company] = await Promise.all([
      this.base.get(),
      options.home ?? this.settings.get().catch(() => null),
      this.legal ? this.legal.company.get().catch(() => null) : null,
    ]);
    const merged = settings ? mergeSiteContent(content, settings) : content;
    if (!company) return merged;
    const policies = mergeShipping(merged.policies, company);
    return withCarrier({ ...merged, company: mergeCompany(merged.company, company), policies }, merged.policies.shipping.carrier);
  }

  async page(slug: InfoPageSlug): Promise<InfoPage | null> {
    if (!this.legal) return this.base.page(slug);
    const [{ company, policies }, record] = await Promise.all([this.get(), this.legal.pages.get(slug).catch(() => null)]);
    const code = this.legal.codePages(company, policies)[slug];
    if (!code) return null;
    const published = record?.published;
    if (!published) return code;
    return legalInfoPage(code, published, { version: published.version, date: colombiaDate(published.publishedAt) }, tokenValues(company, this.legal.whatsapp, policies.shipping));
  }
}

/** Si la transportadora cambió en el panel, los textos que nombraban la anterior la cambian también. */
function withCarrier(c: SiteContent, previous: string): SiteContent {
  const now = c.policies.shipping.carrier;
  if (now === previous) return c;
  const swap = (t: string) => t.split(previous).join(now);
  return {
    ...c,
    brand: { ...c.brand, description: swap(c.brand.description) },
    home: { ...c.home, trust: { ...c.home.trust, items: c.home.trust.items.map((i) => ({ ...i, title: swap(i.title), body: swap(i.body) })) } },
    info: { ...c.info, related: Object.fromEntries(Object.entries(c.info.related).map(([k, v]) => [k, { ...v, body: swap(v.body) }])) as SiteContent["info"]["related"] },
  };
}
