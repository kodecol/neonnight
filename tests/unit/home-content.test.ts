import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { InMemoryHomeSettingsRepository, InMemorySiteMediaRepository } from "@/infrastructure/repositories/in-memory-site-content-repositories";
import { DeleteSiteMedia, GetHomeContent, GetHomeSettings, ListSiteMedia, RegisterSiteVideo, SaveHomeSettings, UploadSiteImage } from "@/application/use-cases/admin/home";
import { publicIdOf } from "@/infrastructure/media/cloudinary-site-media";
import type { HomeSettingsInput } from "@/application/dto/home.dto";
import type { MediaUploader } from "@/application/ports/media-uploader";
import type { VideoUploadSigner } from "@/application/ports/site-media";
import { MediaInUseError } from "@/domain/errors";
import { DiscardHomeDraft } from "@/application/use-cases/admin/home";
import { HOME_BLOCK_IDS, HOME_HISTORY_LIMIT, resolveLayout } from "@/application/ports/home-settings";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { ManagedSiteContentRepository } from "@/infrastructure/content/managed-site-content-repository";

const clock = { now: () => new Date("2026-10-20T12:00:00Z") };

function setup() {
  let n = 0;
  const removed: string[] = [];
  const uploader: MediaUploader = { kind: "local", upload: async (f) => ({ src: `/api/media/${++n}.webp`, width: f.width, height: f.height }) };
  const signer: VideoUploadSigner = {
    enabled: true,
    sign: () => ({ url: "https://api.cloudinary.com/v1_1/demo/video/upload", fields: {} }),
    owns: (src) => src.startsWith("https://res.cloudinary.com/demo/video/upload/") && src.includes("/neonnight/sitio/"),
    posterOf: (src) => src.replace("/upload/", "/upload/so_0/").replace(/\.\w+$/, ".jpg"),
  };
  return {
    siteMedia: new InMemorySiteMediaRepository(),
    homeSettings: new InMemoryHomeSettingsRepository(),
    uploader,
    signer,
    remover: { remove: async (src: string) => void removed.push(src) },
    removed,
    ids: { next: () => `x${++n}` },
    clock,
  };
}

const file = { bytes: new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "), contentType: "image/webp", filename: "a.webp", width: 2400, height: 1350 };
const settings = (over: Partial<HomeSettingsInput["hero"]> = {}, band: Partial<HomeSettingsInput["band"]> = {}): HomeSettingsInput => ({
  hero: { source: "media", mediaId: null, kicker: null, title: "Relojería de autor", text: null, ctaLabel: null, ctaHref: null, ...over },
  band: { mediaId: null, title: null, position: "centro", ...band },
  trust: null,
  testimonials: null,
  social: null,
  layout: null,
});

// La plantilla no trae testimonios ni redes de fábrica: los tests usan los suyos.
const T = (id: string, name: string) => ({ id, quote: "Me atendieron con calma y la pieza llegó como la mostraron.", name, city: "Bogotá", piece: "Reloj de prueba", rating: 5, authorized: false, visible: true });
const NETWORKS = [
  { id: "instagram" as const, enabled: true, handle: "@tienda", href: "https://www.instagram.com/tienda/", description: "Novedades" },
  { id: "facebook" as const, enabled: true, handle: "tienda", href: "https://www.facebook.com/tienda/", description: "Novedades" },
  { id: "tiktok" as const, enabled: false, handle: "", href: "", description: "" },
  { id: "youtube" as const, enabled: true, handle: "tienda", href: "https://www.youtube.com/tienda", description: "Videos" },
];

describe("Inicio editable desde el panel", () => {
  it("sube fotos y videos a la biblioteca; los videos solo desde nuestra carpeta de Cloudinary", async () => {
    const d = setup();
    const photo = await new UploadSiteImage(d).execute(file);
    expect(photo).toMatchObject({ kind: "image", width: 2400, usedIn: [] });
    const video = await new RegisterSiteVideo(d).execute({ src: "https://res.cloudinary.com/demo/video/upload/v1/neonnight/sitio/hero.mp4", width: 1920, height: 1080 });
    expect(video.poster).toBe("https://res.cloudinary.com/demo/video/upload/so_0/v1/neonnight/sitio/hero.jpg");
    await expect(new RegisterSiteVideo(d).execute({ src: "https://evil.example/video.mp4", width: 1, height: 1 })).rejects.toMatchObject({ field: "file" });
    expect(await new ListSiteMedia(d).execute()).toHaveLength(2);
  });

  it("valida el hero propio y que la banda sea una foto existente", async () => {
    const d = setup();
    const photo = await new UploadSiteImage(d).execute(file);
    const video = await new RegisterSiteVideo(d).execute({ src: "https://res.cloudinary.com/demo/video/upload/v1/neonnight/sitio/hero.mp4", width: 1920, height: 1080 });
    const save = new SaveHomeSettings(d);
    await expect(save.execute(settings({ mediaId: null }))).rejects.toBeInstanceOf(ZodError);
    await expect(save.execute(settings({ mediaId: photo.id, title: null }))).rejects.toBeInstanceOf(ZodError);
    await expect(save.execute(settings({ mediaId: photo.id, ctaLabel: "Ver", ctaHref: "https://evil.example" }))).rejects.toBeInstanceOf(ZodError);
    await expect(save.execute(settings({ mediaId: "no-existe" }))).rejects.toMatchObject({ field: "hero.mediaId" });
    await expect(save.execute(settings({ mediaId: photo.id }, { mediaId: video.id }))).rejects.toMatchObject({ field: "band.mediaId" });

    await save.execute(settings({ mediaId: video.id, ctaLabel: "Ver relojería", ctaHref: "/coleccion/relojeria" }, { mediaId: photo.id, title: "Hecho para durar", position: "arriba" }));
    const form = await new GetHomeSettings(d.homeSettings).execute(SITE_CONTENT);
    expect(form.band.position).toBe("arriba");
    const content = await new GetHomeContent(d).execute({ kicker: "Neon Night", cta: "Ver la pieza" });
    expect(content.hero).toMatchObject({ media: { kind: "video" }, title: "Relojería de autor", kicker: "Neon Night", cta: { label: "Ver relojería", href: "/coleccion/relojeria" } });
    expect(content.band).toMatchObject({ image: { src: photo.src, position: "50% 22%" }, title: "Hecho para durar" });
  });

  it("con la pieza destacada no hay hero propio, y lo que está en uso no se puede borrar", async () => {
    const d = setup();
    const photo = await new UploadSiteImage(d).execute(file);
    const spare = await new UploadSiteImage(d).execute(file);
    await new SaveHomeSettings(d).execute(settings({ source: "featured", mediaId: photo.id }, { mediaId: photo.id }));
    const content = await new GetHomeContent(d).execute({ kicker: "k", cta: "c" });
    expect(content.hero).toBeNull();
    expect((await new ListSiteMedia(d).execute()).find((m) => m.id === photo.id)?.usedIn).toEqual(["Banda"]);

    await expect(new DeleteSiteMedia(d).execute(photo.id)).rejects.toBeInstanceOf(MediaInUseError);
    await new DeleteSiteMedia(d).execute(spare.id);
    expect(d.removed).toEqual([spare.src]);
    expect(await d.siteMedia.findById(spare.id)).toBeNull();
  });

  it("solo borra de Cloudinary lo que está en la carpeta del sitio", () => {
    expect(publicIdOf("https://res.cloudinary.com/demo/image/upload/v1712/neonnight/sitio/abc.jpg")).toBe("neonnight/sitio/abc");
    expect(publicIdOf("https://res.cloudinary.com/demo/video/upload/neonnight/sitio/hero.mp4")).toBe("neonnight/sitio/hero");
  });

  it("compromisos, testimonios y redes: lo no editado sigue el código y lo editado se aplica en todo el sitio", async () => {
    const d = setup();
    const content = new ManagedSiteContentRepository(new StaticSiteContentRepository(), d.homeSettings);
    const form = await new GetHomeSettings(d.homeSettings).execute(SITE_CONTENT);
    expect(form.trust).toBeNull();
    // El editor arranca con el contenido actual; los testimonios del código entran como ejemplo sin autorización.
    expect(form.defaults.trust.items).toHaveLength(3);
    expect(form.defaults.testimonials.items).toHaveLength(0);
    expect(form.defaults.social.networks.find((n) => n.id === "tiktok")?.enabled ?? false).toBe(false);

    // Guardar solo el hero no toca los bloques.
    await new SaveHomeSettings(d).execute(settings({ source: "featured" }));
    expect((await content.get()).home.testimonials.items).toHaveLength(0);

    const testimonials = {
      ...form.defaults.testimonials,
      items: [
        { ...T("t1", "Andrea P."), authorized: true },
        { ...T("t2", "Bruno L."), authorized: false },
        { ...T("t3", "Camila R."), authorized: true, visible: false },
      ],
    };
    const trust = { kicker: "Lo que prometemos", items: form.defaults.trust.items.map((t, i) => ({ ...t, title: `Compromiso ${i + 1}` })) };
    const social = { ...form.defaults.social, networks: NETWORKS.map((n) => (n.id === "facebook" ? { ...n, enabled: false } : n)) };
    await new SaveHomeSettings(d).execute({ ...settings({ source: "featured" }), trust, testimonials, social });

    const site = await content.get();
    expect(site.home.trust.kicker).toBe("Lo que prometemos");
    expect(site.home.trust.items.map((i) => [i.number, i.title, i.accent])).toEqual([
      ["01", "Compromiso 1", false],
      ["02", "Compromiso 2", false],
      ["03", "Compromiso 3", true],
    ]);
    // Solo el visible y autorizado se publica.
    expect(site.home.testimonials.items.map((t) => t.name)).toEqual(["Andrea P."]);
    expect(site.social.networks.map((n) => n.id)).toEqual(["instagram", "youtube"]);
    expect(site.social.networks[0]).toMatchObject({ label: "Instagram", cta: "Seguir" });
  });

  it("valida los bloques: tres compromisos, testimonios completos y enlaces de la red correcta", async () => {
    const d = setup();
    const form = await new GetHomeSettings(d.homeSettings).execute(SITE_CONTENT);
    const save = (over: Partial<HomeSettingsInput>) => new SaveHomeSettings(d).execute({ ...settings({ source: "featured" }), ...over });
    await expect(save({ trust: { kicker: null, items: form.defaults.trust.items.slice(0, 2) } })).rejects.toBeInstanceOf(ZodError);
    await expect(save({ testimonials: { ...form.defaults.testimonials, items: [{ ...T("t1", "Andrea P."), quote: "corto" }] } })).rejects.toBeInstanceOf(ZodError);
    const bad = NETWORKS.map((n) => (n.id === "instagram" ? { ...n, href: "https://evil.example/neonnight" } : n));
    await expect(save({ social: { ...form.defaults.social, networks: bad } })).rejects.toBeInstanceOf(ZodError);
    const fake = NETWORKS.map((n) => (n.id === "youtube" ? { ...n, href: "https://www.instagram.com/x" } : n));
    await expect(save({ social: { ...form.defaults.social, networks: fake } })).rejects.toBeInstanceOf(ZodError);
    // Una red apagada no necesita enlace.
    const off = NETWORKS.map((n) => (n.id === "tiktok" ? { ...n, enabled: false, href: "" } : n));
    await expect(save({ social: { ...form.defaults.social, networks: off } })).resolves.toBeUndefined();
  });

  it("borrador para la vista previa: la tienda no cambia hasta publicar", async () => {
    const d = setup();
    const photo = await new UploadSiteImage(d).execute(file);
    await new SaveHomeSettings(d).execute(settings({ mediaId: photo.id, title: "Borrador" }), "draft");
    expect((await new GetHomeContent(d).execute({ kicker: "k", cta: "c" })).hero).toBeNull();
    expect((await new GetHomeContent(d).execute({ kicker: "k", cta: "c" }, { preview: true })).hero?.title).toBe("Borrador");
    const form = await new GetHomeSettings(d.homeSettings).execute(SITE_CONTENT);
    expect(form.hasDraft).toBe(true);
    expect(form.hero.title).toBe("Borrador");
    // Lo que usa el borrador tampoco se puede borrar.
    await expect(new DeleteSiteMedia(d).execute(photo.id)).rejects.toBeInstanceOf(MediaInUseError);

    await new DiscardHomeDraft(d.homeSettings).execute();
    expect((await new GetHomeSettings(d.homeSettings).execute(SITE_CONTENT)).hasDraft).toBe(false);

    await new SaveHomeSettings(d).execute(settings({ mediaId: photo.id, title: "Publicado" }), "draft");
    await new SaveHomeSettings(d).execute(settings({ mediaId: photo.id, title: "Publicado" }), "publish");
    expect((await new GetHomeContent(d).execute({ kicker: "k", cta: "c" })).hero?.title).toBe("Publicado");
    expect((await d.homeSettings.getDraft())).toBeNull();
  });

  it("guarda las últimas versiones publicadas, la más reciente primero", async () => {
    const d = setup();
    let t = Date.parse("2026-10-20T12:00:00Z");
    const save = new SaveHomeSettings({ ...d, clock: { now: () => new Date((t += 60_000)) } });
    for (let i = 1; i <= HOME_HISTORY_LIMIT + 3; i++) await save.execute(settings({ source: "featured" }, { title: `Frase ${i}` }));
    const form = await new GetHomeSettings(d.homeSettings).execute(SITE_CONTENT);
    expect(form.band.title).toBe(`Frase ${HOME_HISTORY_LIMIT + 3}`);
    expect(form.history).toHaveLength(HOME_HISTORY_LIMIT);
    expect(form.history[0]!.input.band.title).toBe(`Frase ${HOME_HISTORY_LIMIT + 2}`);
    expect(new Date(form.history[0]!.at).getTime()).toBeGreaterThan(new Date(form.history[1]!.at).getTime());
  });

  it("orden y visibilidad de bloques: se completa y no admite repetidos", async () => {
    expect(resolveLayout(null).map((b) => b.id)).toEqual(HOME_BLOCK_IDS);
    const custom = resolveLayout([
      { id: "redes", visible: true },
      { id: "redes", visible: false },
      { id: "testimonios", visible: false },
    ]);
    expect(custom.slice(0, 2)).toEqual([
      { id: "redes", visible: true },
      { id: "testimonios", visible: false },
    ]);
    expect(custom).toHaveLength(HOME_BLOCK_IDS.length);

    const d = setup();
    await new SaveHomeSettings(d).execute({ ...settings({ source: "featured" }), layout: [{ id: "garantia", visible: true }, { id: "marcas", visible: false }] });
    const content = await new GetHomeContent(d).execute({ kicker: "k", cta: "c" });
    expect(content.layout[0]).toEqual({ id: "garantia", visible: true });
    expect(content.layout.find((b) => b.id === "marcas")?.visible).toBe(false);
    await expect(new SaveHomeSettings(d).execute({ ...settings({ source: "featured" }), layout: [{ id: "hero" as never, visible: true }] })).rejects.toBeInstanceOf(ZodError);
  });
});
