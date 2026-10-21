import type { InfoBlock, InfoSection } from "../dto/info-page.dto";
import type { CompanyInfo, StorePolicies } from "../dto/site-content.dto";

/**
 * Texto de las páginas legales en un markdown mínimo que el panel edita y que
 * se convierte en los bloques que la tienda ya sabe pintar (InfoBlock):
 *
 *   ## Título de sección {#ancla}
 *   Párrafo (una o varias líneas seguidas).
 *   - lista            1. lista numerada        > nota destacada
 *   | Tabla | con | pipes |  (segunda fila: | --- | --- |)
 *   ::: pasos           ::: datos
 *   Título — cuerpo      Etiqueta: valor
 *   :::                 :::
 *
 * En línea: **negrita** y [enlace](/ruta). Las fichas {correo}, {empresa}…
 * se reemplazan al pintar con los datos de la empresa.
 */

export interface MarkdownIssue {
  /** Línea (desde 1) donde está el problema; 0 si es de toda la página. */
  line: number;
  message: string;
}

const STEP_SEP = " — ";

/** "Qué cubre" → "que-cubre" (sin tildes, minúsculas, guiones). */
export function slugifyId(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const oneLine = (t: string) => t.replace(/\s*\n\s*/g, " ").trim();
const escapeCell = (t: string) => oneLine(t).replace(/\|/g, "\\|");
/** Un párrafo que empieza como otra cosa se escapa con "\" para no cambiar de tipo. */
const SPECIAL_START = /^(- |> |\||## |:::|\d+\. |\\)/;

function serializeBlock(b: InfoBlock): string {
  switch (b.type) {
    case "p": {
      const t = oneLine(b.text);
      return SPECIAL_START.test(t) ? `\\${t}` : t;
    }
    case "list":
      return b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "-"} ${oneLine(it)}`).join("\n");
    case "note":
      return `> ${oneLine(b.text)}`;
    case "steps":
      return ["::: pasos", ...b.items.map((s) => `${oneLine(s.title)}${STEP_SEP}${oneLine(s.body)}`), ":::"].join("\n");
    case "facts":
      return ["::: datos", ...b.items.map((f) => `${oneLine(f.label)}: ${oneLine(f.value)}`), ":::"].join("\n");
    case "table": {
      const row = (cells: string[]) => `| ${cells.map(escapeCell).join(" | ")} |`;
      return [row(b.head), `| ${b.head.map(() => "---").join(" | ")} |`, ...b.rows.map(row)].join("\n");
    }
  }
}

export function serializeSections(sections: readonly InfoSection[]): string {
  return sections.map((s) => [`## ${oneLine(s.title)} {#${s.id}}`, ...s.blocks.map(serializeBlock)].join("\n\n")).join("\n\n") + "\n";
}

/** Celdas de una fila de tabla, respetando "\|" como barra literal. */
function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

/** Convierte el markdown en secciones. Nunca lanza: devuelve también los problemas encontrados. */
export function parseSections(md: string): { sections: InfoSection[]; issues: MarkdownIssue[] } {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const sections: InfoSection[] = [];
  const issues: MarkdownIssue[] = [];
  let i = 0;
  const current = () => sections.at(-1);
  const push = (block: InfoBlock, line: number) => {
    const s = current();
    if (!s) {
      issues.push({ line, message: "El contenido debe empezar con una sección: ## Título" });
      return;
    }
    s.blocks.push(block);
  };

  while (i < lines.length) {
    const raw = lines[i]!;
    const line = raw.trim();
    const n = i + 1;
    if (!line) {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      const m = /^##\s+(.+?)(?:\s*\{#([a-z0-9-]+)\})?$/.exec(line);
      const title = m?.[1]?.trim() ?? "";
      const id = m?.[2] ?? slugifyId(title);
      if (!title || !id) issues.push({ line: n, message: "La sección necesita un título." });
      sections.push({ id, title, blocks: [] });
      i++;
      continue;
    }
    if (line.startsWith(":::")) {
      const kind = line.slice(3).trim();
      const body: Array<{ text: string; n: number }> = [];
      let j = i + 1;
      while (j < lines.length && lines[j]!.trim() !== ":::") {
        if (lines[j]!.trim()) body.push({ text: lines[j]!.trim(), n: j + 1 });
        j++;
      }
      if (j >= lines.length) issues.push({ line: n, message: `Falta cerrar el bloque "${line}" con ":::".` });
      if (kind === "pasos") {
        const items = body.flatMap(({ text, n: ln }) => {
          const k = text.indexOf(STEP_SEP);
          if (k <= 0) {
            issues.push({ line: ln, message: `Cada paso va como "Título — texto".` });
            return [];
          }
          return [{ title: text.slice(0, k).trim(), body: text.slice(k + STEP_SEP.length).trim() }];
        });
        push({ type: "steps", items }, n);
      } else if (kind === "datos") {
        const items = body.flatMap(({ text, n: ln }) => {
          const k = text.indexOf(": ");
          if (k <= 0) {
            issues.push({ line: ln, message: `Cada dato va como "Etiqueta: valor".` });
            return [];
          }
          return [{ label: text.slice(0, k).trim(), value: text.slice(k + 2).trim() }];
        });
        push({ type: "facts", items }, n);
      } else {
        issues.push({ line: n, message: `Bloque desconocido "${line}": usa "::: pasos" o "::: datos".` });
      }
      i = j + 1;
      continue;
    }
    if (line.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) parts.push(lines[i++]!.trim().replace(/^>\s?/, ""));
      push({ type: "note", text: parts.join(" ").trim() }, n);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) rows.push(lines[i++]!.trim());
      const [head, sep, ...body] = rows;
      if (!sep || !/^\|?\s*:?-{3,}/.test(sep)) {
        issues.push({ line: n, message: "La tabla necesita una segunda fila separadora: | --- | --- |" });
        continue;
      }
      const headCells = cells(head!);
      const bodyRows = body.map(cells);
      bodyRows.forEach((r, k) => {
        if (r.length !== headCells.length) issues.push({ line: n + 2 + k, message: `La fila tiene ${r.length} columnas y el encabezado ${headCells.length}.` });
      });
      push({ type: "table", head: headCells, rows: bodyRows }, n);
      continue;
    }
    const ordered = /^\d+\.\s/.test(line);
    if (ordered || line.startsWith("- ")) {
      const re = ordered ? /^\d+\.\s+/ : /^-\s+/;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i]!.trim())) items.push(lines[i++]!.trim().replace(re, ""));
      push(ordered ? { type: "list", items, ordered: true } : { type: "list", items }, n);
      continue;
    }
    // Párrafo: líneas seguidas hasta una en blanco o un bloque.
    const parts: string[] = [];
    while (i < lines.length) {
      const t = lines[i]!.trim();
      if (!t || (parts.length > 0 && /^(## |:::|>|\||- |\d+\.\s)/.test(t))) break;
      parts.push(parts.length === 0 && t.startsWith("\\") ? t.slice(1) : t);
      i++;
    }
    push({ type: "p", text: parts.join(" ") }, n);
  }

  const seen = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.id)) issues.push({ line: 0, message: `Hay dos secciones con el ancla #${s.id}.` });
    seen.add(s.id);
    if (s.blocks.length === 0) issues.push({ line: 0, message: `La sección "${s.title}" está vacía.` });
  }
  if (sections.length === 0) issues.push({ line: 0, message: "La página necesita al menos una sección (## Título)." });
  return { sections, issues };
}

/* ── Fichas con datos de la empresa ─────────────────────────────────────── */

export const LEGAL_TOKENS = ["empresa", "forma", "matricula", "camara", "ciudad", "correo", "correo_datos", "horario", "whatsapp", "nit", "propietario", "transportadora", "rastreo"] as const;
export type LegalToken = (typeof LEGAL_TOKENS)[number];

export const LEGAL_TOKEN_LABELS: Record<LegalToken, string> = {
  empresa: "Nombre comercial",
  forma: "Naturaleza jurídica",
  matricula: "Matrícula mercantil",
  camara: "Cámara de comercio",
  ciudad: "Ciudad",
  correo: "Correo de atención",
  correo_datos: "Correo de datos personales",
  horario: "Horario de atención",
  whatsapp: "WhatsApp",
  nit: "NIT o cédula",
  propietario: "Propietario",
  transportadora: "Transportadora",
  rastreo: "Página de rastreo",
};

export function tokenValues(company: CompanyInfo, whatsapp: string | null, shipping: Pick<StorePolicies["shipping"], "carrier" | "trackingUrl">): Record<LegalToken, string> {
  return {
    empresa: company.tradeName,
    forma: company.legalForm,
    matricula: company.registry.number,
    camara: company.registry.chamber,
    ciudad: company.city,
    correo: company.email,
    correo_datos: company.privacyEmail,
    horario: company.hours,
    whatsapp: whatsapp ?? "(botón del sitio)",
    nit: company.owner?.taxId ?? "",
    propietario: company.owner?.name ?? "",
    transportadora: shipping.carrier,
    rastreo: shipping.trackingUrl,
  };
}

/** Reemplaza las fichas conocidas por su valor; lo desconocido queda igual. */
export function fillTokens(text: string, values: Record<LegalToken, string>): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in values ? values[k as LegalToken] : m));
}

/**
 * Lo contrario: cambia los valores literales de la empresa por su ficha, para
 * que un cambio de correo o de nombre llegue a las páginas editadas. Con dos
 * fichas del mismo valor gana la primera de la lista (correo antes que correo_datos).
 */
export function tokenize(text: string, values: Record<LegalToken, string>): string {
  const pairs = LEGAL_TOKENS.map((k) => [k, values[k]] as const)
    .filter(([, v], idx, all) => v.length >= 3 && all.findIndex(([, w]) => w === v) === idx)
    .sort((a, b) => b[1].length - a[1].length);
  let out = text;
  for (const [k, v] of pairs) out = out.split(v).join(`{${k}}`);
  return out;
}

export function unknownTokens(text: string): string[] {
  return [...new Set([...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!).filter((k) => !(LEGAL_TOKENS as readonly string[]).includes(k)))];
}

/* ── Enlaces ────────────────────────────────────────────────────────────── */

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
// `/\host` y `//host` son externos para el navegador: tras la barra no puede ir otra barra.
const SAFE_HREF = /^(\/(?![\/\\])|#|https:\/\/|mailto:)/;

function textsOf(b: InfoBlock): string[] {
  switch (b.type) {
    case "p":
    case "note":
      return [b.text];
    case "list":
      return b.items;
    case "steps":
      return b.items.flatMap((s) => [s.title, s.body]);
    case "facts":
      return b.items.flatMap((f) => [f.label, f.value]);
    case "table":
      return [...b.head, ...b.rows.flat()];
  }
}

export function sectionTexts(sections: readonly InfoSection[]): string[] {
  return sections.flatMap((s) => [s.title, ...s.blocks.flatMap(textsOf)]);
}

/**
 * Revisa los enlaces: solo destinos seguros y, si son internos, a rutas que
 * existen (y a anclas que existen en esa página).
 */
export function checkLinks(
  sections: readonly InfoSection[],
  opts: { self: string; routes: (path: string) => boolean; anchors: (path: string) => readonly string[] | null },
): MarkdownIssue[] {
  const issues: MarkdownIssue[] = [];
  const ownIds = sections.map((s) => s.id);
  for (const text of sectionTexts(sections)) {
    for (const m of text.matchAll(LINK)) {
      const href = m[2]!;
      if (!SAFE_HREF.test(href)) {
        issues.push({ line: 0, message: `Enlace no permitido: ${href} (usa una ruta del sitio, https:// o mailto:).` });
        continue;
      }
      if (/^(https:|mailto:)/.test(href)) continue;
      const [path, hash] = href.split("#") as [string, string | undefined];
      const target = path || opts.self;
      if (path && !opts.routes(path)) {
        issues.push({ line: 0, message: `El enlace ${href} no lleva a una página del sitio.` });
        continue;
      }
      if (hash) {
        const ids = target === opts.self ? ownIds : opts.anchors(target);
        if (ids && !ids.includes(hash)) issues.push({ line: 0, message: `El ancla #${hash} no existe en ${target}.` });
      }
    }
  }
  return issues;
}

/* ── Versiones ──────────────────────────────────────────────────────────── */

/** "1.0" → "1.1"; con `major`, "1.4" → "2.0". */
export function nextVersion(current: string, major: boolean): string {
  const [a = 1, b = 0] = current.split(".").map((x) => Number.parseInt(x, 10) || 0);
  return major ? `${a + 1}.0` : `${a}.${b + 1}`;
}

/** Fecha AAAA-MM-DD en hora de Colombia (la vigencia se lee como fecha local). */
export function colombiaDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
