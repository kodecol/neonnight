import type { CompanyInfo, SiteContent, StorePolicies } from "@/application/dto/site-content.dto";
import type { InfoPage, InfoPageSlug } from "@/application/dto/info-page.dto";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import type { HomeSettings, HomeSettingsRepository } from "@/application/ports/home-settings";
import type { LegalPagesRepository } from "@/application/ports/legal-pages";
import { mergeCompany, mergeShipping, type CompanySettingsRepository } from "@/application/ports/company-settings";
import { mergeSiteContent } from "@/application/lib/merge-site-content";
import { fillStoreName, mergeIdentity, type IdentitySettingsRepository } from "@/application/ports/identity-settings";
import type { StoreIdentityInput } from "@/application/dto/identity.dto";
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
 * Contenido del sitio = el del código + lo editado en el panel (Identidad,
 * Inicio, datos de la empresa y páginas legales publicadas). Si la base no
 * responde, el sitio sigue con el contenido del código. Al final, las fichas
 * `{tienda}` de los textos se rellenan con el nombre vigente.
 */
export class ManagedSiteContentRepository implements SiteContentRepository {
  constructor(
    private readonly base: SiteContentRepository,
    private readonly settings: HomeSettingsRepository,
    private readonly legal?: ManagedLegal,
    private readonly identity?: IdentitySettingsRepository,
  ) {}

  /** `home` / `identity`: ajustes de Inicio o de Identidad (la vista previa del borrador); sin ellos, los publicados. */
  async get(options: { home?: HomeSettings; identity?: StoreIdentityInput } = {}): Promise<SiteContent> {
    const [content, settings, company, identity] = await Promise.all([
      this.base.get(),
      options.home ?? this.settings.get().catch(() => null),
      this.legal ? this.legal.company.get().catch(() => null) : null,
      options.identity ?? (this.identity ? this.identity.get().catch(() => null) : null),
    ]);
    const branded = { ...content, brand: mergeIdentity(content.brand, identity) };
    const merged = settings ? mergeSiteContent(branded, settings) : branded;
    if (!company) return fillStoreName(merged, merged.brand.name);
    const policies = mergeShipping(merged.policies, company);
    return fillStoreName(withCarrier({ ...merged, company: mergeCompany(merged.company, company), policies }, merged.policies.shipping.carrier), merged.brand.name);
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
