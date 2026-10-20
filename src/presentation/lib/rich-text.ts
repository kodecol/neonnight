/**
 * Marcas en línea de los textos editoriales: `**negrita**` y `[texto](href)`.
 * Se convierten en nodos, nunca en HTML, así que no hay inyección posible.
 */
export type RichNode = { type: "text"; text: string } | { type: "strong"; children: RichNode[] } | { type: "link"; text: string; href: string };

const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
/** Solo rutas internas, anclas, https y mailto. */
const SAFE_HREF = /^(\/(?!\/)|#|https:\/\/|mailto:)/;

export function parseRichText(input: string): RichNode[] {
  const out: RichNode[] = [];
  let last = 0;
  for (const m of input.matchAll(TOKEN)) {
    if (m.index > last) out.push({ type: "text", text: input.slice(last, m.index) });
    // La negrita puede llevar un enlace dentro: **[Garantía](/garantia)**.
    if (m[1] !== undefined) out.push({ type: "strong", children: parseRichText(m[1]) });
    else if (SAFE_HREF.test(m[3]!)) out.push({ type: "link", text: m[2]!, href: m[3]! });
    else out.push({ type: "text", text: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ type: "text", text: input.slice(last) });
  return out;
}

export const isExternalHref = (href: string) => href.startsWith("https://");
