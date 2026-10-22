import { z } from "zod";
import type { InfoPageSlug } from "./info-page.dto";
import type { LegalToken } from "../lib/legal-markdown";

const text = (min: number, max: number, msg = "Obligatorio.") => z.string().trim().min(min, msg).max(max);

export const LegalPageInputSchema = z.object({
  kicker: text(1, 40),
  title: text(2, 60),
  lead: text(10, 400, "Escribe una entradilla (mínimo 10 caracteres)."),
  description: text(50, 300, "La descripción para buscadores necesita al menos 50 caracteres."),
  body: text(1, 60_000, "La página necesita contenido."),
  /** Al publicar: sube la versión mayor (2.0) en vez de la menor (1.1). */
  major: z.boolean(),
});
export type LegalPageInput = z.infer<typeof LegalPageInputSchema>;

/**
 * Los datos de la empresa se insertan en el markdown legal ({correo},
 * {ciudad}…): un salto de línea abriría ahí otra sección (`## `) o bloque.
 */
const ONE_LINE = /^[^\r\n]*$/;
const ONE_LINE_MSG = "Escríbelo en una sola línea.";
const line = (min: number, max: number) => text(min, max).regex(ONE_LINE, ONE_LINE_MSG);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(ONE_LINE, ONE_LINE_MSG)
    .nullable()
    .transform((v) => (v ? v : null));

export const CompanyInputSchema = z
  .object({
    tradeName: line(2, 60),
    legalForm: line(2, 60),
    registryNumber: line(1, 20),
    chamber: line(2, 80),
    ownerName: optional(80),
    ownerTaxId: optional(20),
    city: line(2, 60),
    region: line(2, 60),
    email: z.string().trim().email("Correo no válido.").regex(ONE_LINE, ONE_LINE_MSG),
    privacyEmail: z.string().trim().email("Correo no válido.").regex(ONE_LINE, ONE_LINE_MSG),
    hours: line(2, 120),
    carrier: line(2, 60),
    foundingYear: z.number().int().min(1900).max(2100).nullable().optional(),
    trackingUrl: z
      .string()
      .trim()
      .max(200)
      // new URL() descarta los saltos de línea: hay que mirarlos antes.
      .regex(ONE_LINE, ONE_LINE_MSG)
      .refine((v) => {
        try {
          return new URL(v).protocol === "https:";
        } catch {
          return false;
        }
      }, "Pega la dirección https de la página de rastreo."),
  })
  .superRefine((c, ctx) => {
    // El propietario se muestra solo con nombre y documento.
    if (Boolean(c.ownerName) !== Boolean(c.ownerTaxId)) ctx.addIssue({ code: "custom", path: [c.ownerName ? "ownerTaxId" : "ownerName"], message: "Escribe nombre y documento del propietario, o ninguno." });
  });
export type CompanyInput = z.infer<typeof CompanyInputSchema>;

export type LegalStatus = "fabrica" | "publicado" | "borrador";

export interface LegalPageRowDto {
  slug: InfoPageSlug;
  title: string;
  status: LegalStatus;
  version: string;
  /** Vigencia (AAAA-MM-DD). */
  effective: string;
}

export interface LegalVersionDto {
  version: string;
  publishedAt: string;
  content: Omit<LegalPageInput, "major">;
}

export interface LegalEditorDto {
  slug: InfoPageSlug;
  layout: "editorial" | "legal";
  content: Omit<LegalPageInput, "major">;
  hasDraft: boolean;
  /** Versión y vigencia de lo que hoy ve la tienda. */
  current: { version: string; effective: string; source: "fabrica" | "publicado" };
  /** La versión que tendrá la próxima publicación (menor y mayor). */
  next: { minor: string; major: string };
  history: LegalVersionDto[];
  tokens: Array<{ token: LegalToken; label: string; value: string }>;
}
