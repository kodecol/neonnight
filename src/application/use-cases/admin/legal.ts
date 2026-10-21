import { INFO_PAGE_SLUGS, type InfoPage, type InfoPageSlug } from "../../dto/info-page.dto";
import { CompanyInputSchema, LegalPageInputSchema, type CompanyInput, type LegalEditorDto, type LegalPageRowDto } from "../../dto/legal.dto";
import type { SiteContentRepository } from "../../ports/site-content-repository";
import type { LegalPageContent, LegalPagesRepository, LegalPublished } from "../../ports/legal-pages";
import type { CompanySettingsRepository } from "../../ports/company-settings";
import type { Clock } from "../../ports/clock";
import { FieldValidationError } from "../../lib/errors";
import { parseSaveMode, type SaveMode } from "../../lib/save-mode";
import {
  LEGAL_TOKENS,
  LEGAL_TOKEN_LABELS,
  checkLinks,
  colombiaDate,
  fillTokens,
  nextVersion,
  parseSections,
  serializeSections,
  tokenValues,
  tokenize,
  unknownTokens,
  type LegalToken,
} from "../../lib/legal-markdown";

export interface LegalDeps {
  legalPages: LegalPagesRepository;
  companySettings: CompanySettingsRepository;
  /** Contenido del sitio ya combinado (empresa editada y páginas publicadas). */
  content: SiteContentRepository;
  /** WhatsApp con formato legible, para la ficha {whatsapp}. */
  whatsappLabel: string | null;
}

/** "1.10" > "1.9": compara versiones mayor.menor. */
const versionKey = (v: string) => v.split(".").map((x) => Number.parseInt(x, 10) || 0);
const maxVersion = (versions: string[]) => versions.reduce((a, b) => {
  const [a1 = 0, a2 = 0] = versionKey(a);
  const [b1 = 0, b2 = 0] = versionKey(b);
  return b1 > a1 || (b1 === a1 && b2 > a2) ? b : a;
});

/**
 * Página pública a partir de lo publicado en el panel: el markdown se
 * convierte en los mismos bloques que las páginas de código.
 */
export function legalInfoPage(base: InfoPage, content: LegalPageContent, meta: { version: string; date: string }, values: Record<LegalToken, string>): InfoPage {
  return {
    ...base,
    kicker: fillTokens(content.kicker, values),
    title: fillTokens(content.title, values),
    lead: fillTokens(content.lead, values),
    description: fillTokens(content.description, values),
    updatedAt: meta.date,
    version: meta.version,
    sections: parseSections(fillTokens(content.body, values)).sections,
  };
}

/** Texto de fábrica como contenido editable (con fichas en lugar de los datos de la empresa). */
function seedFrom(page: InfoPage, values: Record<LegalToken, string>): Omit<LegalPageContent, never> {
  return {
    kicker: page.kicker,
    title: page.title,
    lead: tokenize(page.lead, values),
    description: tokenize(page.description, values),
    body: tokenize(serializeSections(page.sections), values),
  };
}

async function context(deps: LegalDeps) {
  const site = await deps.content.get();
  return { site, values: tokenValues(site.company, deps.whatsappLabel, site.policies.shipping) };
}

export class ListLegalPages {
  constructor(private readonly deps: LegalDeps) {}

  async execute(): Promise<LegalPageRowDto[]> {
    return Promise.all(
      INFO_PAGE_SLUGS.map(async (slug) => {
        const [record, page] = await Promise.all([this.deps.legalPages.get(slug), this.deps.content.page(slug)]);
        return {
          slug,
          title: page?.title ?? slug,
          status: record.draft ? "borrador" : record.published ? "publicado" : "fabrica",
          version: page?.version ?? "1.0",
          effective: page?.updatedAt ?? "",
        } satisfies LegalPageRowDto;
      }),
    );
  }
}

export class GetLegalEditor {
  constructor(private readonly deps: LegalDeps) {}

  async execute(slug: InfoPageSlug): Promise<LegalEditorDto> {
    const [record, page, { values }] = await Promise.all([this.deps.legalPages.get(slug), this.deps.content.page(slug), context(this.deps)]);
    if (!page) throw new FieldValidationError("slug", "Esa página no existe.");
    const current = record.published ?? null;
    const content = record.draft ?? current ?? seedFrom(page, values);
    const base = maxVersion([page.version, ...(current ? [current.version] : []), ...record.history.map((h) => h.version)]);
    return {
      slug,
      layout: page.layout,
      content: { kicker: content.kicker, title: content.title, lead: content.lead, description: content.description, body: content.body },
      hasDraft: record.draft !== null,
      current: { version: page.version, effective: page.updatedAt, source: current ? "publicado" : "fabrica" },
      next: { minor: nextVersion(base, false), major: nextVersion(base, true) },
      history: record.history.map((h) => ({
        version: h.version,
        publishedAt: h.publishedAt.toISOString(),
        content: { kicker: h.kicker, title: h.title, lead: h.lead, description: h.description, body: h.body },
      })),
      tokens: LEGAL_TOKENS.map((token) => ({ token, label: LEGAL_TOKEN_LABELS[token], value: values[token] })),
    };
  }
}

/** Rutas a las que un enlace interno puede apuntar. */
const isRoute = (path: string) => path === "/" || path === "/coleccion" || path.startsWith("/coleccion/") || (INFO_PAGE_SLUGS as readonly string[]).includes(path.slice(1));

/**
 * Guarda una página como borrador (vista previa) o la publica con la
 * siguiente versión. El markdown se valida antes: si no se puede convertir
 * sin pérdidas o tiene enlaces rotos, no se guarda.
 */
export class SaveLegalPage {
  constructor(private readonly deps: LegalDeps & { clock: Clock }) {}

  async execute(slug: InfoPageSlug, raw: unknown, mode: SaveMode): Promise<{ version: string | null }> {
    if (!(INFO_PAGE_SLUGS as readonly string[]).includes(slug)) throw new FieldValidationError("slug", "Esa página no existe.");
    const target = parseSaveMode(mode);
    const input = LegalPageInputSchema.parse(raw);
    const { values } = await context(this.deps);

    const unknown = [input.kicker, input.title, input.lead, input.description, input.body].flatMap(unknownTokens);
    if (unknown.length) throw new FieldValidationError("body", `Ficha desconocida: ${[...new Set(unknown)].map((t) => `{${t}}`).join(", ")}.`);

    const { sections, issues } = parseSections(fillTokens(input.body, values));
    // Anclas de las demás páginas (lo que hoy ve la tienda).
    const anchors = new Map<string, readonly string[]>();
    await Promise.all(
      INFO_PAGE_SLUGS.filter((s) => s !== slug).map(async (s) => {
        const p = await this.deps.content.page(s);
        if (p) anchors.set(`/${s}`, p.sections.map((x) => x.id));
      }),
    );
    const linkIssues = checkLinks(sections, { self: `/${slug}`, routes: isRoute, anchors: (p) => anchors.get(p) ?? null });
    const all = [...issues, ...linkIssues];
    if (all.length) throw new FieldValidationError("body", all.map((i) => (i.line ? `Línea ${i.line}: ${i.message}` : i.message)).join(" · "));

    const content: LegalPageContent = { kicker: input.kicker, title: input.title, lead: input.lead, description: input.description, body: input.body };
    if (target === "draft") {
      await this.deps.legalPages.saveDraft(slug, { ...content, savedAt: this.deps.clock.now() });
      return { version: null };
    }
    const [record, page] = await Promise.all([this.deps.legalPages.get(slug), this.deps.content.page(slug)]);
    const base = maxVersion([page?.version ?? "1.0", ...(record.published ? [record.published.version] : []), ...record.history.map((h) => h.version)]);
    const published: LegalPublished = { ...content, version: nextVersion(base, input.major), publishedAt: this.deps.clock.now() };
    await this.deps.legalPages.publish(slug, published);
    return { version: published.version };
  }
}

export class DiscardLegalDraft {
  constructor(private readonly legalPages: LegalPagesRepository) {}

  execute(slug: InfoPageSlug): Promise<void> {
    return this.legalPages.discardDraft(slug);
  }
}

/**
 * Vuelve al texto de fábrica publicándolo como una versión nueva (sube la
 * menor, vigente desde hoy): la versión que ve la tienda nunca baja y lo
 * publicado antes queda en el historial. Si nunca se publicó, solo descarta
 * el borrador (la tienda ya muestra el texto de fábrica).
 */
export class ResetLegalPage {
  constructor(private readonly deps: LegalDeps & { clock: Clock }) {}

  async execute(slug: InfoPageSlug): Promise<{ version: string | null }> {
    if (!(INFO_PAGE_SLUGS as readonly string[]).includes(slug)) throw new FieldValidationError("slug", "Esa página no existe.");
    const record = await this.deps.legalPages.get(slug);
    // Lo publicado pasa al historial y la tienda vuelve a la página del código: de ahí sale el texto de fábrica.
    await this.deps.legalPages.reset(slug);
    if (!record.published) return { version: null };
    const [factory, { values }] = await Promise.all([this.deps.content.page(slug), context(this.deps)]);
    if (!factory) throw new FieldValidationError("slug", "Esa página no existe.");
    const base = maxVersion([factory.version, record.published.version, ...record.history.map((h) => h.version)]);
    const published: LegalPublished = { ...seedFrom(factory, values), version: nextVersion(base, false), publishedAt: this.deps.clock.now() };
    await this.deps.legalPages.publish(slug, published);
    return { version: published.version };
  }
}

/** La página con el borrador (o lo publicado si no hay), para la vista previa del panel. */
export class GetLegalPreview {
  constructor(private readonly deps: LegalDeps) {}

  async execute(slug: InfoPageSlug): Promise<{ page: InfoPage; draft: boolean } | null> {
    const [record, page, { values }] = await Promise.all([this.deps.legalPages.get(slug), this.deps.content.page(slug), context(this.deps)]);
    if (!page) return null;
    if (!record.draft) return { page, draft: false };
    return { page: legalInfoPage(page, record.draft, { version: `${page.version} · borrador`, date: colombiaDate(record.draft.savedAt) }, values), draft: true };
  }
}

export class GetCompanySettings {
  constructor(private readonly content: SiteContentRepository) {}

  /** Lo que el formulario muestra: lo guardado o, si nunca se editó, los datos del código. */
  async execute(): Promise<CompanyInput> {
    const {
      company: c,
      policies: { shipping },
    } = await this.content.get();
    return {
      tradeName: c.tradeName,
      legalForm: c.legalForm,
      registryNumber: c.registry.number,
      chamber: c.registry.chamber,
      ownerName: c.owner?.name ?? null,
      ownerTaxId: c.owner?.taxId ?? null,
      city: c.city,
      region: c.region,
      email: c.email,
      privacyEmail: c.privacyEmail,
      hours: c.hours,
      carrier: shipping.carrier,
      trackingUrl: shipping.trackingUrl,
    };
  }
}

export class SaveCompanySettings {
  constructor(private readonly deps: { companySettings: CompanySettingsRepository; clock: Clock }) {}

  async execute(raw: unknown): Promise<void> {
    const input = CompanyInputSchema.parse(raw);
    await this.deps.companySettings.save({ ...input, updatedAt: this.deps.clock.now() });
  }
}
