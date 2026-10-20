/**
 * Páginas institucionales y legales (/nosotros, /envios, /pagos, /garantia,
 * /devoluciones, /terminos, /privacidad). El texto admite dos marcas en línea:
 * `**negrita**` y `[enlace](/ruta)`; nada de HTML, así que se pinta sin
 * `dangerouslySetInnerHTML`.
 */
export const INFO_PAGE_SLUGS = ["nosotros", "envios", "pagos", "garantia", "devoluciones", "terminos", "privacidad"] as const;
export type InfoPageSlug = (typeof INFO_PAGE_SLUGS)[number];

export type InfoBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  /** Pasos numerados con título (proceso de verificación, cómo reclamar…). */
  | { type: "steps"; items: Array<{ title: string; body: string }> }
  | { type: "table"; head: string[]; rows: string[][] }
  /** Recuadro destacado con borde de acento. */
  | { type: "note"; text: string }
  /** Datos clave en pares etiqueta/valor (identidad del vendedor, plazos). */
  | { type: "facts"; items: Array<{ label: string; value: string }> };

export interface InfoSection {
  /** Ancla del índice (#id). */
  id: string;
  title: string;
  blocks: InfoBlock[];
}

export interface InfoPage {
  slug: InfoPageSlug;
  /** `editorial` (Nosotros) o `legal` (índice lateral, vigencia y versión). */
  layout: "editorial" | "legal";
  kicker: string;
  title: string;
  /** Meta description y entradilla. */
  description: string;
  lead: string;
  /** Fecha de vigencia (ISO, AAAA-MM-DD). */
  updatedAt: string;
  version: string;
  sections: InfoSection[];
}
