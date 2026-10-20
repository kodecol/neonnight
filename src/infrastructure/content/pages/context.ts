import type { CompanyInfo, StorePolicies } from "@/application/dto/site-content.dto";

/** Datos con los que se redactan las páginas: así los plazos salen de una sola fuente. */
export interface PageContext {
  company: CompanyInfo;
  policies: StorePolicies;
  /** WhatsApp con formato legible ("+57 300 000 0000") o null si no está configurado. */
  whatsapp: string | null;
}

/** Vigencia de los textos legales (AAAA-MM-DD) y su versión. */
export const LEGAL_EFFECTIVE_DATE = "2026-10-20";
export const LEGAL_VERSION = "1.0";

/** "1 a 3" */
export const range = ([a, b]: readonly [number, number]) => `${a} a ${b}`;

/** Canal de WhatsApp para los textos: el número o, si falta, el botón del sitio. */
export const whatsappLabel = (ctx: PageContext) => (ctx.whatsapp ? `WhatsApp ${ctx.whatsapp}` : "WhatsApp (botón del sitio)");
