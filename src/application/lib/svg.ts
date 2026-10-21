/**
 * Revisión de un SVG subido como logo. Lista blanca: solo arte estático
 * (formas, degradados, recortes, máscaras y estilos). Se rechaza cualquier
 * otro elemento, los prefijos de espacio de nombres (`<s:script>` es un
 * script si `s` apunta al de SVG), los manejadores de eventos, las entidades
 * en los valores (`&#106;avascript:`), los enlaces que no sean a un #id del
 * propio archivo y los url() externos (con esquema o `//host`). Además, el
 * sitio lo pinta siempre como imagen (<img> o máscara CSS), nunca en línea,
 * así que el navegador no ejecuta nada.
 */
const ELEMENTS: ReadonlySet<string> = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "title",
  "desc",
  "style",
  "use",
]);
const SVG_NS = "http://www.w3.org/2000/svg";
/** Únicos atributos con prefijo: declaraciones de espacios de nombres, `xlink:href` (solo a #id) y `xml:space`. */
const PREFIXED = /^(xmlns:[\w.-]+|xlink:href|xml:space)$/;
const NAME = /^[A-Za-z_][\w.:-]*$/;
/** Etiqueta de apertura o cierre con atributos siempre entre comillas (XML). */
const TAG = /<(\/?)([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
const ATTR = /\s+([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
/** url() que no apunte a un #id del propio archivo: cubre esquemas, `//host` y rutas. */
const EXTERNAL_URL = /url\((?!\s*["']?\s*#)/i;
const CSS_FORBIDDEN: ReadonlyArray<[RegExp, string]> = [
  [/@import/i, "@import en estilos"],
  [/image-set\s*\(|expression\s*\(/i, "recursos externos en estilos"],
  [/javascript\s*:/i, "enlaces javascript:"],
];

export const MAX_SVG_BYTES = 512 * 1024;

export type SvgCheck = { ok: true; ratio: number } | { ok: false; reason: string };

const num = (v: string | undefined) => {
  const n = v ? Number.parseFloat(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Lo que no se permite en un valor (atributo o bloque <style>); null si está limpio. */
function valueIssue(value: string): string | null {
  // Ni entidades ni referencias numéricas: el navegador las decodifica antes de leer el valor.
  if (value.includes("&")) return "entidades en los atributos o estilos";
  if (EXTERNAL_URL.test(value)) return "recursos externos en estilos";
  for (const [re, what] of CSS_FORBIDDEN) if (re.test(value)) return what;
  return null;
}

function attrsIssue(element: string, attrs: string): string | null {
  let href = false;
  for (const [, key = "", dq, sq] of attrs.matchAll(ATTR)) {
    const value = dq ?? sq ?? "";
    if (/^on/i.test(key)) return "manejadores de eventos";
    if (key.includes(":") && !PREFIXED.test(key)) return `atributos con prefijo (${key})`;
    if (key === "xmlns" && value.trim() !== SVG_NS) return "otro espacio de nombres";
    if (key === "href" || key === "xlink:href") {
      if (!value.trim().startsWith("#")) return "enlaces a otros archivos";
      href = true;
    }
    const issue = valueIssue(value);
    if (issue) return issue;
  }
  if (element === "use" && !href) return "enlaces a otros archivos";
  return null;
}

/** Recorre las etiquetas; devuelve el motivo del rechazo o null si todo es de la lista blanca. */
function markupIssue(text: string): string | null {
  // El DOCTYPE estándar de los programas de diseño se tolera; las entidades no (XXE, "billion laughs").
  if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(text)) return "declaraciones de entidades";
  // Fuera lo inerte: comentarios, DOCTYPE y la declaraci\u00F3n XML. Cualquier otra instrucci\u00F3n (<?xml-stylesheet?>) no pasa.
  const body = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>/, "")
    .replace(/<!\[CDATA\[([^<]*?)\]\]>/g, "$1");
  const open: string[] = [];
  let root = false;
  for (let i = body.indexOf("<"); i !== -1; i = body.indexOf("<", i)) {
    TAG.lastIndex = i;
    const m = TAG.exec(body);
    if (!m || !NAME.test(m[2]!)) return "marcas que no son de un SVG simple";
    const [whole, close, name = "", attrs = "", selfClose] = m;
    i += whole.length;
    if (close) {
      if (attrs || selfClose || open.pop() !== name) return "marcas que no son de un SVG simple";
      continue;
    }
    if (name.includes(":")) return `elementos con prefijo (<${name}>)`;
    if (!ELEMENTS.has(name)) return `elementos no permitidos (<${name}>)`;
    if (!root && name !== "svg") return "marcas que no son de un SVG simple";
    root = true;
    const issue = attrsIssue(name, attrs);
    if (issue) return issue;
    if (selfClose) continue;
    open.push(name);
    if (name === "style") {
      const end = body.indexOf("</style", i);
      if (end === -1) return "marcas que no son de un SVG simple";
      const css = valueIssue(body.slice(i, end));
      if (css) return css;
      i = end;
    }
  }
  return root && open.length === 0 ? null : "marcas que no son de un SVG simple";
}

export function inspectSvg(text: string): SvgCheck {
  const root = /<svg\b[^>]*>/i.exec(text);
  if (!root) return { ok: false, reason: "No es un SVG." };
  const issue = markupIssue(text);
  if (issue) return { ok: false, reason: `El SVG trae ${issue}: expórtalo de nuevo como arte plano.` };
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
