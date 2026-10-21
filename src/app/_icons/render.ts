import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { getContainer } from "@/infrastructure/container";
import { readLocalMedia } from "@/infrastructure/media/local-disk-uploader";
import { GetBrandAssets, type BrandAssets } from "@/application/use-cases/brand-assets";
import { encodeIco } from "@/application/lib/ico";
import { ogPhoto } from "../_og/brand";

/**
 * Favicon e íconos de la tienda (pestaña, pantalla de inicio, manifest):
 * el isotipo de Identidad sobre el fondo de Apariencia. Sin isotipo propio y
 * con el fondo de fábrica se sirven los archivos del sitio tal cual.
 */
const PUBLIC = join(process.cwd(), "public");
const FACTORY_DIR = join(PUBLIC, "assets/icons");
const SITE_ISOTYPE = join(PUBLIC, "assets/isotipo-dark.png");

/** Lado del cuadro y fracción que ocupa el isotipo (maskable: zona segura del 80 % en círculo). */
export const ICON_FILES = {
  "icon-192.png": { size: 192, fill: 0.74 },
  "icon-512.png": { size: 512, fill: 0.74 },
  "maskable-512.png": { size: 512, fill: 0.56 },
  "apple-touch-icon.png": { size: 180, fill: 0.74 },
} as const;
export type IconFile = keyof typeof ICON_FILES;
export const isIconFile = (f: string): f is IconFile => Object.hasOwn(ICON_FILES, f);

/** Archivo del sitio que sirve cada ícono de fábrica (el resto se dibuja con el isotipo del sitio). */
const FACTORY_FILES: Partial<Record<IconFile | "favicon.ico", string>> = {
  "icon-512.png": "icon-512.png",
  "apple-touch-icon.png": "apple-touch-icon.png",
  "favicon.ico": "favicon.ico",
};
const FAVICON_SIZES = [16, 32, 48] as const;

export const brandAssets = () => new GetBrandAssets(getContainer()).execute();

/** Bytes del isotipo de Identidad (Cloudinary lo entrega en PNG aunque sea SVG); null si no se puede leer. */
async function isotypeBytes(src: string): Promise<Buffer | null> {
  try {
    const remote = ogPhoto(src, 512, "png");
    if (remote) {
      const res = await fetch(remote, { signal: AbortSignal.timeout(5000) });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
    if (src.startsWith("/api/media/")) return (await readLocalMedia(src.slice("/api/media/".length)))?.bytes ?? null;
    const file = normalize(join(PUBLIC, src));
    return file.startsWith(join(PUBLIC, "assets")) ? await readFile(file) : null;
  } catch {
    return null;
  }
}

async function compose(brand: BrandAssets, size: number, fill: number): Promise<Buffer> {
  const art = (brand.isotype && (await isotypeBytes(brand.isotype.src))) || (await readFile(SITE_ISOTYPE));
  const box = Math.round(size * fill);
  const glyph = await sharp(art, { density: 300 })
    .resize(box, box, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: brand.bg } })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toBuffer();
}

async function render(brand: BrandAssets, file: IconFile | "favicon.ico"): Promise<Buffer> {
  const factory = brand.factoryIcons ? FACTORY_FILES[file] : undefined;
  if (factory) return readFile(join(FACTORY_DIR, factory));
  if (file === "favicon.ico") {
    // A 16-48 px el isotipo va casi a sangre para que se distinga en la pestaña.
    const pngs = await Promise.all(FAVICON_SIZES.map(async (size) => ({ size, png: await compose(brand, size, 0.9) })));
    return Buffer.from(encodeIco(pngs));
  }
  if (brand.factoryIcons && file === "icon-192.png") return sharp(join(FACTORY_DIR, "icon-512.png")).resize(192, 192).png().toBuffer();
  const { size, fill } = ICON_FILES[file];
  return compose(brand, size, fill);
}

// Se dibujan una vez por versión publicada; al publicar cambia la versión y se descartan.
let cache: { version: string; files: Map<string, Promise<Buffer>> } = { version: "", files: new Map() };

export async function iconResponse(file: IconFile | "favicon.ico", requested: string | null): Promise<Response> {
  const brand = await brandAssets();
  if (cache.version !== brand.version) cache = { version: brand.version, files: new Map() };
  let bytes = cache.files.get(file);
  if (!bytes) {
    bytes = render(brand, file);
    cache.files.set(file, bytes);
    bytes.catch(() => cache.files.delete(file));
  }
  const body = await bytes;
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": file === "favicon.ico" ? "image/x-icon" : "image/png",
      "content-length": String(body.byteLength),
      // Con la versión vigente en la URL el archivo no cambia nunca; sin ella (o vieja), una hora.
      "cache-control": brand.version && requested === brand.version ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    },
  });
}
