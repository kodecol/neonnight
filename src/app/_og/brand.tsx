import { getContainer } from "@/infrastructure/container";
import { GetActiveAppearance } from "@/application/use-cases/admin/appearance";
import { DEFAULT_APPEARANCE } from "@/application/dto/appearance.dto";
import { hexToRgb } from "@/application/lib/contrast";
import { readLocalMedia } from "@/infrastructure/media/local-disk-uploader";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

/**
 * Piezas comunes de las imágenes de vista previa (Open Graph): la fuente de
 * la marca, el isotipo y la conversión de fotos a un formato que entienda
 * el renderizador (no lee WebP ni AVIF).
 */
const PUBLIC = join(process.cwd(), "public");

let fonts: Promise<Array<{ name: string; data: Buffer; weight: 200 | 500 | 600; style: "normal" }>> | null = null;

export function ogFonts() {
  fonts ??= Promise.all(
    ([200, 500, 600] as const).map(async (weight) => ({ name: "Archivo", data: await readFile(join(PUBLIC, "fonts/og", `archivo-${weight}.woff`)), weight, style: "normal" as const })),
  ).catch((e: unknown) => {
    fonts = null;
    throw e;
  });
  return fonts;
}

let isotype: Promise<string> | null = null;

/**
 * Isotipo para las vistas previas: el de Identidad (de Cloudinary, del disco
 * local o del sitio, convertido a PNG si es SVG) o, si no hay o no se puede
 * leer, el del sitio.
 */
export async function ogIsotype(asset?: { src: string } | null): Promise<string> {
  const remote = ogPhoto(asset?.src, 160, "png");
  if (remote) return remote;
  const own = asset ? await isotypeBytes(asset.src) : null;
  if (own) {
    const png = await sharp(own, { density: 300 }).resize(160, 160, { fit: "inside" }).png().toBuffer().catch(() => null);
    if (png) return `data:image/png;base64,${png.toString("base64")}`;
  }
  isotype ??= readFile(join(PUBLIC, "assets/isotipo-dark.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`);
  return isotype;
}

/** Bytes del isotipo de Identidad (Cloudinary lo entrega en PNG aunque sea SVG); null si no se puede leer. */
export async function isotypeBytes(src: string): Promise<Buffer | null> {
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

/** Alto del isotipo para un ancho dado según su proporción (el del sitio es 656 × 677). */
export const ogIsotypeHeight = (width: number, asset?: { ratio: number } | null) => Math.round(width / (asset?.ratio ?? 656 / 677));

/** URL de una foto apta para el renderizador: solo Cloudinary, convertida a PNG/JPG al ancho pedido. */
export function ogPhoto(src: string | null | undefined, width: number, format: "png" | "jpg"): string | null {
  if (!src || !src.startsWith("https://res.cloudinary.com/")) return null;
  return src.replace(/\/image\/upload\//, `/image/upload/f_${format},q_auto,c_limit,w_${width}/`);
}

export interface OgColors {
  bg: string;
  surface: string;
  ink: string;
  ink2: string;
  ink3: string;
  accent: string;
  divider: string;
}

/** Colores de las vistas previas: los del tema publicado (Ajustes › Apariencia) o los de fábrica. */
export async function ogColors(): Promise<OgColors> {
  const a = await new GetActiveAppearance(getContainer().appearance).execute();
  const c = (a ?? DEFAULT_APPEARANCE).colors;
  const [r, g, b] = hexToRgb(c.divider);
  return { bg: c.bg, surface: c.surface, ink: c.ink, ink2: c.ink2, ink3: c.ink3, accent: c.accent, divider: `rgba(${r},${g},${b},0.3)` };
}
