import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { InMemoryHomeSettingsRepository, InMemorySiteMediaRepository } from "@/infrastructure/repositories/in-memory-site-content-repositories";
import { DeleteSiteMedia, GetHomeContent, GetHomeSettings, ListSiteMedia, RegisterSiteVideo, SaveHomeSettings, UploadSiteImage } from "@/application/use-cases/admin/home";
import { publicIdOf } from "@/infrastructure/media/cloudinary-site-media";
import type { HomeSettingsInput } from "@/application/dto/home.dto";
import type { MediaUploader } from "@/application/ports/media-uploader";
import type { VideoUploadSigner } from "@/application/ports/site-media";
import { MediaInUseError } from "@/domain/errors";

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

const file = { bytes: new Uint8Array([1, 2, 3]), contentType: "image/webp", filename: "a.webp", width: 2400, height: 1350 };
const settings = (over: Partial<HomeSettingsInput["hero"]> = {}, band: Partial<HomeSettingsInput["band"]> = {}): HomeSettingsInput => ({
  hero: { source: "media", mediaId: null, kicker: null, title: "Relojería de autor", text: null, ctaLabel: null, ctaHref: null, ...over },
  band: { mediaId: null, title: null, position: "centro", ...band },
});

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
    const form = await new GetHomeSettings(d.homeSettings).execute();
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
});
