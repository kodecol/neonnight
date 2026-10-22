import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { container } from "@/app/_lib/tenant";
import { TtlLru } from "@/infrastructure/tenancy/lru";
import { GetBrandAssets, type BrandAssets } from "@/application/use-cases/brand-assets";
import { encodeIco } from "@/application/lib/ico";
import { isotypeBytes } from "../_og/brand";

/**
 * Favicon e íconos de la tienda (pestaña, pantalla de inicio, manifest):
 * el isotipo de Identidad sobre el fondo de Apariencia. Sin isotipo propio y
 * con el fondo de fábrica se sirven los archivos del sitio tal cual.
 */
const PUBLIC = join(process.cwd(), "public");
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

export const brandAssets = async () => new GetBrandAssets(await container()).execute();

/** El isotipo a la medida del cuadro. Si sharp no puede leer el de Identidad (un video, un archivo dañado), el del sitio. */
async function glyphOf(brand: BrandAssets, box: number): Promise<Buffer> {
  const fit = (art: Buffer) =>
    sharp(art, { density: 300 })
      .resize(box, box, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  const own = brand.isotype ? await isotypeBytes(brand.isotype.src) : null;
  const glyph = own ? await fit(own).catch(() => null) : null;
  return glyph ?? fit(await readFile(SITE_ISOTYPE));
}

async function compose(brand: BrandAssets, size: number, fill: number): Promise<Buffer> {
  const glyph = await glyphOf(brand, Math.round(size * fill));
  return sharp({ create: { width: size, height: size, channels: 4, background: brand.bg } })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Dibuja un ícono (exportada para los tests). */
export async function renderIcon(brand: BrandAssets, file: IconFile | "favicon.ico"): Promise<Buffer> {
  const dir = brand.iconsDir ? join(PUBLIC, brand.iconsDir) : null;
  const factory = dir ? FACTORY_FILES[file] : undefined;
  if (dir && factory) return readFile(join(dir, factory));
  if (file === "favicon.ico") {
    // A 16-48 px el isotipo va casi a sangre para que se distinga en la pestaña.
    const pngs = await Promise.all(FAVICON_SIZES.map(async (size) => ({ size, png: await compose(brand, size, 0.9) })));
    return Buffer.from(encodeIco(pngs));
  }
  if (dir && file === "icon-192.png") return sharp(join(dir, "icon-512.png")).resize(192, 192).png().toBuffer();
  const { size, fill } = ICON_FILES[file];
  return compose(brand, size, fill);
}

// Se dibujan una vez por tienda y versión publicada; al publicar cambia la versión y la
// entrada vieja sale sola de la LRU (tope: 300 íconos ≈ 60 tiendas × 5 archivos).
const cache = new TtlLru<string, Promise<Buffer>>(300, 0);

export async function iconResponse(file: IconFile | "favicon.ico", requested: string | null): Promise<Response> {
  const brand = await brandAssets();
  const key = `${(await container()).config.slug}:${brand.version}:${file}`;
  let bytes = cache.get(key);
  if (!bytes) {
    bytes = renderIcon(brand, file);
    cache.set(key, bytes);
    bytes.catch(() => cache.delete(key));
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
