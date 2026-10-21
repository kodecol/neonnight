/**
 * Revisión de un SVG subido como logo. Solo se acepta arte estático: sin
 * scripts, manejadores de eventos, enlaces externos, entidades ni contenido
 * incrustado. Además, el sitio lo pinta siempre como imagen (<img> o
 * máscara CSS), nunca en línea, así que el navegador no ejecuta nada.
 */
const FORBIDDEN: ReadonlyArray<[RegExp, string]> = [
  [/<script[\s>/]/i, "scripts"],
  [/\son[a-z]+\s*=/i, "manejadores de eventos"],
  [/javascript\s*:/i, "enlaces javascript:"],
  [/<foreignObject[\s>/]/i, "contenido incrustado (foreignObject)"],
  // El DOCTYPE estándar de los programas de diseño se tolera; las entidades no (XXE, "billion laughs").
  [/<!ENTITY|<!DOCTYPE[^>]*\[/i, "declaraciones de entidades"],
  [/<(iframe|embed|object|audio|video|image)[\s>/]/i, "elementos externos"],
  [/(?:xlink:)?href\s*=\s*["']\s*(?!#)/i, "enlaces a otros archivos"],
  [/url\(\s*["']?\s*(?!#)[a-z]+:/i, "recursos externos en estilos"],
  [/@import/i, "@import en estilos"],
];

export const MAX_SVG_BYTES = 512 * 1024;

export type SvgCheck = { ok: true; ratio: number } | { ok: false; reason: string };

const num = (v: string | undefined) => {
  const n = v ? Number.parseFloat(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function inspectSvg(text: string): SvgCheck {
  const root = /<svg\b[^>]*>/i.exec(text);
  if (!root) return { ok: false, reason: "No es un SVG." };
  for (const [re, what] of FORBIDDEN) if (re.test(text)) return { ok: false, reason: `El SVG trae ${what}: expórtalo de nuevo como arte plano.` };
  const tag = root[0];
  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
  const box = attr("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const w = box && box.length === 4 && box[2]! > 0 ? box[2]! : num(attr("width"));
  const h = box && box.length === 4 && box[3]! > 0 ? box[3]! : num(attr("height"));
  if (!w || !h) return { ok: false, reason: "El SVG no declara viewBox ni ancho y alto." };
  return { ok: true, ratio: roundRatio(w / h) };
}

/** Proporción con dos decimales, acotada a algo razonable para un logo. */
export function roundRatio(r: number): number {
  return Math.min(12, Math.max(0.2, Math.round(r * 100) / 100));
}
