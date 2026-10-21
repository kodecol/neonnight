import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { sniffImageFormat } from "@/application/lib/image-format";
import { UploadBrandLogo } from "@/application/use-cases/admin/brands";
import { UploadIdentityAsset } from "@/application/use-cases/admin/identity";
import { UploadImage } from "@/application/use-cases/admin/upload-image";
import { CloudinaryMediaUploader } from "@/infrastructure/media/cloudinary-uploader";
import type { MediaUploader } from "@/application/ports/media-uploader";

const enc = (s: string) => new TextEncoder().encode(s);
const EVIL_SVG = enc('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script><path d="M0 0h100v100z"/></svg>');
const art = (format: "png" | "jpeg" | "webp" | "avif") =>
  sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
    .toFormat(format)
    .toBuffer()
    .then((b) => new Uint8Array(b));

function recorder() {
  const uploaded: string[] = [];
  const uploader: MediaUploader = { kind: "local", upload: async (f) => (uploaded.push(f.contentType), { src: "/api/media/x", width: f.width, height: f.height }) };
  return { uploaded, uploader };
}

describe("Subidas: el formato sale de los bytes, no del tipo declarado", () => {
  it("reconoce PNG, JPG, WebP, AVIF y SVG por su contenido", async () => {
    expect(sniffImageFormat(await art("png"))).toBe("image/png");
    expect(sniffImageFormat(await art("jpeg"))).toBe("image/jpeg");
    expect(sniffImageFormat(await art("webp"))).toBe("image/webp");
    expect(sniffImageFormat(await art("avif"))).toBe("image/avif");
    expect(sniffImageFormat(EVIL_SVG)).toBe("image/svg+xml");
    expect(sniffImageFormat(enc('﻿  <?xml version="1.0"?><svg/>'))).toBe("image/svg+xml");
    expect(sniffImageFormat(enc("GIF89a"))).toBeNull();
  });

  it("un SVG con <script> declarado como PNG no se sube (marcas, identidad y fotos)", async () => {
    const { uploaded, uploader } = recorder();
    const file = { bytes: EVIL_SVG, contentType: "image/png", filename: "logo.png", width: 100, height: 100 };
    await expect(new UploadBrandLogo(uploader).execute(file)).rejects.toMatchObject({ field: "file", message: expect.stringContaining("SVG") });
    await expect(new UploadIdentityAsset(uploader).execute(file)).rejects.toMatchObject({ field: "file" });
    await expect(new UploadImage(uploader).execute(file)).rejects.toMatchObject({ field: "file" });
    // Declarado como SVG pasa por inspectSvg y tampoco.
    await expect(new UploadBrandLogo(uploader).execute({ ...file, contentType: "image/svg+xml" })).rejects.toMatchObject({ field: "file" });
    expect(uploaded).toEqual([]);
  });

  it("tampoco se acepta otro formato disfrazado (WebP declarado PNG, bytes sueltos)", async () => {
    const { uploaded, uploader } = recorder();
    const webp = await art("webp");
    await expect(new UploadBrandLogo(uploader).execute({ bytes: webp, contentType: "image/png", filename: "a.png", width: 8, height: 8 })).rejects.toThrow(/es WebP/);
    await expect(new UploadImage(uploader).execute({ bytes: enc("hola"), contentType: "image/jpeg", filename: "a.jpg", width: 8, height: 8 })).rejects.toThrow(/no es una imagen/);
    await expect(new UploadImage(uploader).execute({ bytes: webp, contentType: "image/webp", filename: "a.webp", width: 8, height: 8 })).resolves.toBeTruthy();
    await expect(new UploadBrandLogo(uploader).execute({ bytes: await art("avif"), contentType: "image/avif", filename: "a.avif", width: 8, height: 8 })).resolves.toBeTruthy();
    expect(uploaded).toEqual(["image/webp", "image/avif"]);
  });
});

describe("Cloudinary: allowed_formats según el tipo", () => {
  afterEach(() => vi.restoreAllMocks());

  it("pide a Cloudinary que rechace lo que no sea el formato declarado", async () => {
    const options: Array<Record<string, unknown>> = [];
    vi.spyOn(cloudinary.uploader, "upload_stream").mockImplementation(((opts: Record<string, unknown>, cb: (err: unknown, res: unknown) => void) => {
      options.push(opts);
      return { end: () => cb(undefined, { secure_url: "https://res.cloudinary.com/demo/image/upload/v1/x.png", width: 8, height: 8 }) };
    }) as never);
    const uploader = new CloudinaryMediaUploader("pruebas");
    const file = { bytes: await art("png"), filename: "a", width: 8, height: 8 };
    await uploader.upload({ ...file, contentType: "image/png" });
    await uploader.upload({ ...file, contentType: "image/svg+xml" });
    await uploader.upload({ ...file, contentType: "image/jpeg" });
    expect(options.map((o) => o.allowed_formats)).toEqual([["png"], ["svg"], ["jpg"]]);
    await expect(uploader.upload({ ...file, contentType: "text/html" })).rejects.toThrow(/no soportado/);
  });
});
