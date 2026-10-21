import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { ManagedSiteContentRepository } from "@/infrastructure/content/managed-site-content-repository";
import { InMemoryHomeSettingsRepository } from "@/infrastructure/repositories/in-memory-site-content-repositories";
import { InMemoryCompanySettingsRepository, InMemoryLegalPagesRepository } from "@/infrastructure/repositories/in-memory-legal-repositories";
import {
  DiscardLegalDraft,
  GetCompanySettings,
  GetLegalEditor,
  GetLegalPreview,
  ListLegalPages,
  ResetLegalPage,
  SaveCompanySettings,
  SaveLegalPage,
} from "@/application/use-cases/admin/legal";
import { LEGAL_HISTORY_LIMIT } from "@/application/ports/legal-pages";

function setup() {
  let t = Date.parse("2026-10-21T15:00:00Z");
  const staticContent = new StaticSiteContentRepository(SITE_CONTENT, "573001234567");
  const legalPages = new InMemoryLegalPagesRepository();
  const companySettings = new InMemoryCompanySettingsRepository();
  const content = new ManagedSiteContentRepository(staticContent, new InMemoryHomeSettingsRepository(), {
    pages: legalPages,
    company: companySettings,
    codePages: (c, p) => staticContent.pagesFor(c, p),
    whatsapp: staticContent.whatsapp,
  });
  return { legalPages, companySettings, content, whatsappLabel: staticContent.whatsapp, clock: { now: () => new Date((t += 60_000)) } };
}

describe("Legales editables desde el panel", () => {
  it("el editor arranca con el texto de fábrica, con fichas en lugar de los datos de la empresa", async () => {
    const d = setup();
    const editor = await new GetLegalEditor(d).execute("terminos");
    expect(editor.current).toEqual({ version: "1.0", effective: "2026-10-20", source: "fabrica" });
    expect(editor.next).toEqual({ minor: "1.1", major: "2.0" });
    expect(editor.content.body).toContain("{correo}");
    expect(editor.content.body).not.toContain(SITE_CONTENT.company.email);
    expect((await new ListLegalPages(d).execute()).every((r) => r.status === "fabrica")).toBe(true);
  });

  it("borrador, vista previa y publicación con versión y fecha de vigencia", async () => {
    const d = setup();
    const editor = await new GetLegalEditor(d).execute("terminos");
    const input = { ...editor.content, body: `${editor.content.body}\n## Nueva sección {#nueva}\n\nTexto nuevo; escríbenos a {correo}.\n`, major: false };

    await new SaveLegalPage(d).execute("terminos", input, "draft");
    expect((await d.content.page("terminos"))!.sections.some((s) => s.id === "nueva")).toBe(false);
    const preview = (await new GetLegalPreview(d).execute("terminos"))!;
    expect(preview.draft).toBe(true);
    expect(preview.page.sections.at(-1)).toMatchObject({ id: "nueva", blocks: [{ type: "p", text: `Texto nuevo; escríbenos a ${SITE_CONTENT.company.email}.` }] });
    expect((await new ListLegalPages(d).execute()).find((r) => r.slug === "terminos")?.status).toBe("borrador");

    expect(await new SaveLegalPage(d).execute("terminos", input, "publish")).toEqual({ version: "1.1" });
    const page = (await d.content.page("terminos"))!;
    expect(page).toMatchObject({ version: "1.1", updatedAt: "2026-10-21" });
    expect(page.sections.at(-1)?.id).toBe("nueva");
    // Las demás páginas siguen con el texto de fábrica.
    expect((await d.content.page("privacidad"))!.version).toBe("1.0");

    expect(await new SaveLegalPage(d).execute("terminos", { ...input, major: true }, "publish")).toEqual({ version: "2.0" });
    const after = await new GetLegalEditor(d).execute("terminos");
    expect(after.history.map((h) => h.version)).toEqual(["1.1"]);
    expect(after.next).toEqual({ minor: "2.1", major: "3.0" });
  });

  it("no publica markdown con problemas, fichas desconocidas ni enlaces rotos", async () => {
    const d = setup();
    const { content } = await new GetLegalEditor(d).execute("envios");
    const save = (body: string) => new SaveLegalPage(d).execute("envios", { ...content, body, major: false }, "publish");
    await expect(save("Sin sección")).rejects.toMatchObject({ field: "body" });
    await expect(save("## A\n\nHola {nombre}")).rejects.toThrow(/Ficha desconocida/);
    await expect(save("## A\n\nVer [garantía](/garantia#no-existe)")).rejects.toThrow(/#no-existe/);
    await expect(save("## A\n\nVer [otra](/inventada)")).rejects.toThrow(/\/inventada/);
    await expect(save("## A\n\nVer [x](javascript:alert(1))")).rejects.toThrow(/no permitido/);
    await expect(new SaveLegalPage(d).execute("envios", { ...content, description: "corta", major: false }, "publish")).rejects.toBeInstanceOf(ZodError);
    await expect(save("## A\n\nVer [garantía](/garantia#que-cubre) y [arriba](#a)")).resolves.toEqual({ version: "1.1" });
  });

  it("guarda las últimas versiones, descarta borradores y vuelve al texto de fábrica", async () => {
    const d = setup();
    const { content } = await new GetLegalEditor(d).execute("pagos");
    for (let i = 1; i <= LEGAL_HISTORY_LIMIT + 2; i++) await new SaveLegalPage(d).execute("pagos", { ...content, lead: `Entradilla número ${i} de prueba.`, major: false }, "publish");
    let editor = await new GetLegalEditor(d).execute("pagos");
    expect(editor.current.version).toBe(`1.${LEGAL_HISTORY_LIMIT + 2}`);
    expect(editor.history).toHaveLength(LEGAL_HISTORY_LIMIT);

    await new SaveLegalPage(d).execute("pagos", { ...content, lead: "Borrador que se descarta.", major: false }, "draft");
    await new DiscardLegalDraft(d.legalPages).execute("pagos");
    editor = await new GetLegalEditor(d).execute("pagos");
    expect(editor.hasDraft).toBe(false);
    expect(editor.content.lead).toBe(`Entradilla número ${LEGAL_HISTORY_LIMIT + 2} de prueba.`);

    await new ResetLegalPage(d.legalPages).execute("pagos");
    const page = (await d.content.page("pagos"))!;
    expect(page.version).toBe("1.0");
    // La siguiente publicación sigue numerando después de lo ya publicado.
    expect((await new GetLegalEditor(d).execute("pagos")).next.minor).toBe(`1.${LEGAL_HISTORY_LIMIT + 3}`);
  });

  it("los datos de la empresa se editan y llegan al sitio y a las páginas (de fábrica y publicadas)", async () => {
    const d = setup();
    const form = await new GetCompanySettings(d.content).execute();
    expect(form.email).toBe(SITE_CONTENT.company.email);
    await new SaveLegalPage(d).execute("terminos", { ...(await new GetLegalEditor(d).execute("terminos")).content, major: false }, "publish");

    await expect(new SaveCompanySettings(d).execute({ ...form, ownerName: "Ana Pérez", ownerTaxId: null })).rejects.toBeInstanceOf(ZodError);
    await new SaveCompanySettings(d).execute({ ...form, email: "hola@neonightonline.com", ownerName: "Ana Pérez", ownerTaxId: "1.020.304.050" });

    const site = await d.content.get();
    expect(site.company.email).toBe("hola@neonightonline.com");
    expect(site.company.owner).toEqual({ name: "Ana Pérez", taxId: "1.020.304.050" });
    const text = (p: Awaited<ReturnType<typeof d.content.page>>) => JSON.stringify(p!.sections);
    // Publicada (fichas) y de fábrica (redactada con los datos nuevos).
    expect(text(await d.content.page("terminos"))).toContain("hola@neonightonline.com");
    expect(text(await d.content.page("privacidad"))).toContain("Ana Pérez");
    // El correo de datos personales no cambió: la política lo sigue mostrando.
    expect(text(await d.content.page("privacidad"))).toContain(SITE_CONTENT.company.privacyEmail);
  });

  it("con otra razón comercial, ninguna página de fábrica dice Neon Night (marca blanca)", async () => {
    const d = setup();
    const form = await new GetCompanySettings(d.content).execute();
    await new SaveCompanySettings(d).execute({ ...form, tradeName: "CASA AURORA" });
    for (const slug of ["pagos", "devoluciones", "garantia", "terminos", "nosotros", "envios"] as const) {
      const page = await d.content.page(slug);
      const text = JSON.stringify({ description: page!.description, sections: page!.sections });
      expect(text, slug).not.toMatch(/neon\s*night/i);
    }
    expect((await d.content.page("pagos"))!.description).toContain("CASA AURORA nunca ve ni guarda");
  });

  it("la transportadora se edita y llega a la home, a Envíos y a las páginas publicadas", async () => {
    const d = setup();
    const before = await d.content.get();
    expect(before.policies.shipping).toMatchObject({ carrier: "Interrapidísimo", trackingUrl: "https://www.interrapidisimo.com/" });
    const editor = await new GetLegalEditor(d).execute("envios");
    expect(editor.content.body).toContain("{transportadora}");
    expect(editor.content.body).toContain("({rastreo})");
    await new SaveLegalPage(d).execute("envios", { ...editor.content, major: false }, "publish");

    const form = await new GetCompanySettings(d.content).execute();
    await expect(new SaveCompanySettings(d).execute({ ...form, trackingUrl: "http://inseguro.example" })).rejects.toBeInstanceOf(ZodError);
    await new SaveCompanySettings(d).execute({ ...form, carrier: "Servientrega", trackingUrl: "https://www.servientrega.com/" });

    const site = await d.content.get();
    expect(site.policies.shipping).toMatchObject({ carrier: "Servientrega", trackingUrl: "https://www.servientrega.com/", transitMain: [1, 3] });
    expect(site.home.trust.items.map((i) => i.body).join(" ")).toContain("con Servientrega");
    expect(site.info.related.envios.body).toContain("Servientrega");
    const envios = JSON.stringify((await d.content.page("envios"))!.sections);
    expect(envios).toContain("[página de Servientrega](https://www.servientrega.com/)");
    expect(envios).not.toContain("Interrapidísimo");
    expect(JSON.stringify((await d.content.page("devoluciones"))!.sections)).toContain("Servientrega");
  });
});
