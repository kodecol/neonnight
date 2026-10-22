import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import sharp from "sharp";
import type { MediaUploader } from "@/application/ports/media-uploader";
import type { IdentityAsset } from "@/application/dto/identity.dto";
import { UploadIdentityAsset } from "@/application/use-cases/admin/identity";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg" };

/**
 * Imagen de marca del brand.json → medio de la instancia. Una ruta del sitio
 * (`/assets/…`) se usa tal cual; una URL https se descarga UNA vez (5 s, 3 MB,
 * solo PNG/WebP/AVIF/SVG) y se sube como cualquier isotipo del panel (los SVG
 * pasan la misma revisión que en Marcas). En runtime nunca se lee la URL
 * externa: así los íconos no dependen de un tercero ni abren la puerta a SSRF.
 */
export async function resolveBrandAsset(ref: string, alt: string, uploader: MediaUploader, publicDir = join(process.cwd(), "public")): Promise<IdentityAsset> {
  if (ref.startsWith("/assets/")) {
    const file = normalize(join(publicDir, ref));
    if (!file.startsWith(join(publicDir, "assets"))) throw new Error(`Ruta fuera del sitio: ${ref}`);
    // Si el archivo no viaja en este build (salida standalone sin public/), se usa igual:
    // lo sirve el hosting; solo se pierde la proporción exacta.
    const meta = await readFile(file)
      .then((b) => sharp(b).metadata())
      .catch((e: unknown) => (console.warn(`[brand] no se pudo leer ${ref} para medirlo: ${String(e)}`), null));
    return { src: ref, alt, ratio: ratioOf(meta?.width, meta?.height) };
  }
  const res = await fetch(ref, { signal: AbortSignal.timeout(5_000), redirect: "follow" });
  if (!res.ok) throw new Error(`No se pudo descargar ${ref} (HTTP ${res.status}).`);
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const ext = TYPES[contentType];
  if (!ext) throw new Error(`${ref}: tipo ${contentType || "desconocido"}; usa PNG, WebP, AVIF o SVG.`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error(`${ref}: pesa más de 3 MB.`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new Error(`${ref}: pesa más de 3 MB.`);
  const meta = await sharp(bytes).metadata();
  const uploaded = await new UploadIdentityAsset(uploader).execute({ bytes, contentType, filename: `marca.${ext}`, width: meta.width ?? 0, height: meta.height ?? 0 });
  return { src: uploaded.src, alt, ratio: uploaded.ratio };
}

function ratioOf(w?: number, h?: number): number {
  return w && h ? Math.round((w / h) * 1000) / 1000 : 1;
}
