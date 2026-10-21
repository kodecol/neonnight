import { describe, expect, it } from "vitest";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { ManagedSiteContentRepository } from "@/infrastructure/content/managed-site-content-repository";
import { InMemoryHomeSettingsRepository, InMemorySiteMediaRepository } from "@/infrastructure/repositories/in-memory-site-content-repositories";
import { InMemoryIdentitySettingsRepository } from "@/infrastructure/repositories/in-memory-identity-repository";
import { InMemoryVersionedSettings } from "@/infrastructure/repositories/in-memory-versioned-settings";
import { InMemoryCompanySettingsRepository, InMemoryLegalPagesRepository } from "@/infrastructure/repositories/in-memory-legal-repositories";
import { GetIdentityEditor, SaveIdentity } from "@/application/use-cases/admin/identity";
import { SaveAppearance } from "@/application/use-cases/admin/appearance";
import { SaveHomeSettings } from "@/application/use-cases/admin/home";
import { GetLegalEditor, SaveLegalPage } from "@/application/use-cases/admin/legal";
import { DEFAULT_APPEARANCE } from "@/application/dto/appearance.dto";
import type { StoreAppearance } from "@/application/ports/appearance-settings";
import type { HomeSettingsInput } from "@/application/dto/home.dto";

const clock = { now: () => new Date("2026-10-21T12:00:00Z") };
// Lo que una server action puede recibir del cliente en vez de "draft" | "publish".
const BAD_MODES = ["borrador", "", "DRAFT", null, 1] as unknown as Array<"draft">;

describe("Modo de guardado (borrador o publicar) validado en el caso de uso", () => {
  it("Identidad: un modo desconocido no publica", async () => {
    const identity = new InMemoryIdentitySettingsRepository();
    const { factory } = await new GetIdentityEditor(identity).execute(SITE_CONTENT.brand);
    for (const mode of BAD_MODES) await expect(new SaveIdentity({ identity, clock }).execute({ ...factory, name: "Casa Pirata" }, mode)).rejects.toMatchObject({ field: "mode" });
    expect(await identity.get()).toBeNull();
    expect(await identity.getDraft()).toBeNull();
  });

  it("Apariencia: un modo desconocido no publica", async () => {
    const appearance = new InMemoryVersionedSettings<StoreAppearance>();
    for (const mode of BAD_MODES) await expect(new SaveAppearance({ appearance, clock }).execute(DEFAULT_APPEARANCE, mode)).rejects.toMatchObject({ field: "mode" });
    expect(await appearance.get()).toBeNull();
  });

  it("Inicio: un modo desconocido no publica", async () => {
    const homeSettings = new InMemoryHomeSettingsRepository();
    const before = await homeSettings.get();
    const input: HomeSettingsInput = {
      hero: { source: "featured", mediaId: null, kicker: null, title: "Relojería de autor", text: null, ctaLabel: null, ctaHref: null },
      band: { mediaId: null, title: null, position: "centro" },
      trust: null,
      testimonials: null,
      social: null,
      layout: null,
    };
    const save = new SaveHomeSettings({ siteMedia: new InMemorySiteMediaRepository(), homeSettings, clock });
    for (const mode of BAD_MODES) await expect(save.execute(input, mode)).rejects.toMatchObject({ field: "mode" });
    expect(await homeSettings.get()).toEqual(before);
    await save.execute(input, "draft");
    expect(await homeSettings.get()).toEqual(before);
  });

  it("Legales: un modo desconocido no publica", async () => {
    const staticContent = new StaticSiteContentRepository(SITE_CONTENT, "573001234567");
    const legalPages = new InMemoryLegalPagesRepository();
    const companySettings = new InMemoryCompanySettingsRepository();
    const content = new ManagedSiteContentRepository(staticContent, new InMemoryHomeSettingsRepository(), {
      pages: legalPages,
      company: companySettings,
      codePages: (c, p) => staticContent.pagesFor(c, p),
      whatsapp: staticContent.whatsapp,
    });
    const d = { legalPages, companySettings, content, whatsappLabel: staticContent.whatsapp, clock };
    const editor = await new GetLegalEditor(d).execute("terminos");
    for (const mode of BAD_MODES) await expect(new SaveLegalPage(d).execute("terminos", { ...editor.content, major: false }, mode)).rejects.toMatchObject({ field: "mode" });
    expect(await legalPages.get("terminos")).toMatchObject({ published: null, draft: null });
  });
});
