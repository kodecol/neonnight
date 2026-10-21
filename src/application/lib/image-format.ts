/**
 * Formato real de un archivo subido, leído de sus bytes (firma mágica) y no
 * del tipo que declara el navegador: un SVG con <script> renombrado a .png
 * llega como `image/png` y no debe saltarse la revisión de inspectSvg.
 */
export type ImageFormat = "image/png" | "image/jpeg" | "image/webp" | "image/avif" | "image/svg+xml";

export const FORMAT_LABEL: Record<ImageFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/svg+xml": "SVG",
};

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const startsWith = (b: Uint8Array, sig: readonly number[]) => sig.every((x, i) => b[i] === x);

/** Marcas ISO-BMFF (`ftyp`) que declaran AVIF: la principal o una compatible. */
function isAvif(b: Uint8Array): boolean {
  if (b.length < 16 || ascii(b, 4, 8) !== "ftyp") return false;
  const size = Math.min(b.length, ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0);
  const brands = [ascii(b, 8, 12)];
  for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(b, i, i + 4));
  return brands.some((x) => x === "avif" || x === "avis");
}

/** Texto de marcas que abre como un SVG (con o sin declaración XML, DOCTYPE o comentario delante). */
function isSvgText(b: Uint8Array): boolean {
  const head = new TextDecoder().decode(b.subarray(0, 1024)).replace(/^﻿/, "").trimStart().toLowerCase();
  return head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<!doctype svg") || head.startsWith("<!--");
}

/** El formato por contenido; null si no es ninguno de los admitidos. */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (isAvif(bytes)) return "image/avif";
  if (isSvgText(bytes)) return "image/svg+xml";
  return null;
}

/** Motivo del rechazo si el contenido no es del formato declarado; null si coincide. */
export function formatMismatch(declared: string, bytes: Uint8Array): string | null {
  const real = sniffImageFormat(bytes);
  if (real === declared) return null;
  const said = FORMAT_LABEL[declared as ImageFormat] ?? declared;
  return real ? `El archivo dice ser ${said} pero es ${FORMAT_LABEL[real]}: súbelo con su extensión real.` : `El archivo dice ser ${said} pero su contenido no es una imagen válida.`;
}
