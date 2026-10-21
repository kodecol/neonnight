import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { StoreIdentitySchema } from "@/application/dto/identity.dto";
import { ApplyIdentity, GetIdentityEditor, SaveIdentity, UploadIdentityAsset } from "@/application/use-cases/admin/identity";
import { IDENTITY_HISTORY_LIMIT, fillStoreName, mergeIdentity } from "@/application/ports/identity-settings";
import { InMemoryIdentitySettingsRepository } from "@/infrastructure/repositories/in-memory-identity-repository";
import { InMemoryHomeSettingsRepository } from "@/infrastructure/repositories/in-memory-site-content-repositories";
import { ManagedSiteContentRepository } from "@/infrastructure/content/managed-site-content-repository";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";

const identity = {
  name: "Casa Aurora",
  wordmark: "CASA AURORA",
  tagline: "Relojes y joyas con historia, elegidos uno por uno.",
  description: "Relojes y joyas de las grandes casas, verificados y con garantía, con envío asegurado a toda Colombia.",
  isotype: { src: "https://res.cloudinary.com/demo/image/upload/v1/neonnight/sitio/identidad/iso.svg", alt: "", ratio: 1 },
  logo: null,
};

function setup() {
  let t = Date.parse("2026-10-21T12:00:00Z");
  const repo = new InMemoryIdentitySettingsRepository();
  const deps = { identity: repo, clock: { now: () => new Date((t += 60_000)) } };
  const content = new ManagedSiteContentRepository(new StaticSiteContentRepository(), new InMemoryHomeSettingsRepository(), undefined, repo);
  return { repo, deps, content };
}

describe("Identidad de la tienda (marca blanca, fase 1)", () => {
  it("sin nada publicado, el sitio es Neon Night y las fichas {tienda} se rellenan", async () => {
    const { content } = setup();
    const site = await content.get();
    expect(site.brand.name).toBe("Neon Night");
    expect(site.footer.copyrightTemplate).toBe("© {year} Neon Night");
    expect(site.home.brands.disclaimer).toMatch(/^Neon Night es un revendedor/);
    expect(JSON.stringify(site)).not.toContain("{tienda}");
  });

  it("publicar cambia nombre, wordmark, textos e isotipo en todo el contenido", async () => {
    const { deps, content } = setup();
    await new SaveIdentity(deps).execute(identity);
    const site = await content.get();
    expect(site.brand).toMatchObject({ name: "Casa Aurora", wordmark: "CASA AURORA", tagline: identity.tagline, isotype: identity.isotype, logoWide: null });
    expect(site.footer.copyrightTemplate).toBe("© {year} Casa Aurora");
    expect(site.home.hero.fallbackKicker).toBe("Casa Aurora");
    expect(JSON.stringify(site)).not.toContain("Neon Night es un revendedor");
    // Los datos legales de la empresa no cambian con la identidad (viven en Legales).
    expect(site.company.tradeName).toBe(SITE_CONTENT.company.tradeName);
  });

  it("el borrador solo se ve en la vista previa; publicar guarda el historial", async () => {
    const { repo, deps, content } = setup();
    const save = new SaveIdentity(deps);
    await save.execute({ ...identity, name: "Borrador" }, "draft");
    expect((await content.get()).brand.name).toBe("Neon Night");
    const draft = (await repo.getDraft())!;
    expect((await content.get({ identity: draft })).brand.name).toBe("Borrador");

    for (let i = 1; i <= IDENTITY_HISTORY_LIMIT + 2; i++) await save.execute({ ...identity, name: `Versión ${i}` });
    const editor = await new GetIdentityEditor(repo).execute(SITE_CONTENT.brand);
    expect(editor.input.name).toBe(`Versión ${IDENTITY_HISTORY_LIMIT + 2}`);
    expect(editor.hasDraft).toBe(false);
    expect(editor.history).toHaveLength(IDENTITY_HISTORY_LIMIT);
    expect(editor.history[0]!.input.name).toBe(`Versión ${IDENTITY_HISTORY_LIMIT + 1}`);
    expect(editor.factory.name).toBe("Neon Night");
  });

  it("brand:apply valida el objeto (contrato del brand.config.json)", async () => {
    const { deps, repo } = setup();
    await expect(new ApplyIdentity(deps).execute({ ...identity, name: "" })).rejects.toBeInstanceOf(ZodError);
    await expect(new ApplyIdentity(deps).execute({ ...identity, isotype: { src: "https://evil.example/x.svg", alt: "", ratio: 1 } })).rejects.toBeInstanceOf(ZodError);
    await new ApplyIdentity(deps).execute(identity);
    expect((await repo.get())?.name).toBe("Casa Aurora");
    expect(StoreIdentitySchema.safeParse({ ...identity, extra: 1 }).success).toBe(true);
  });

  it("utilidades puras: fusión y relleno de {tienda}", () => {
    expect(mergeIdentity(SITE_CONTENT.brand, null)).toBe(SITE_CONTENT.brand);
    expect(fillStoreName({ a: ["Hola {tienda}", 3], b: { c: "{tienda}{tienda}" } }, "X")).toEqual({ a: ["Hola X", 3], b: { c: "XX" } });
  });

  it("el isotipo se sube revisado (sin scripts en el SVG)", async () => {
    const uploader = { kind: "local" as const, upload: async () => ({ src: "/api/media/iso.svg", width: 100, height: 100 }) };
    const svg = (body: string) => new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`);
    await expect(new UploadIdentityAsset(uploader).execute({ bytes: svg("<path d='M0 0h100v100z'/>"), contentType: "image/svg+xml", filename: "iso.svg", width: 1, height: 1 })).resolves.toMatchObject({ ratio: 1 });
    await expect(new UploadIdentityAsset(uploader).execute({ bytes: svg("<script>alert(1)</script>"), contentType: "image/svg+xml", filename: "iso.svg", width: 1, height: 1 })).rejects.toMatchObject({ field: "file" });
  });
});
