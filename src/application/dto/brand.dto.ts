import { z } from "zod";
import type { BrandLogoMode } from "@/domain/entities/brand";

/** Logos propios: assets del repo, subidas locales o Cloudinary (también SVG). */
// Solo caracteres de ruta: el src termina dentro de un url() de CSS (sin comillas, paréntesis ni `..`).
const LOGO_SRC_RE = /^(\/assets\/|\/api\/media\/|https:\/\/res\.cloudinary\.com\/)(?!.*\.\.)[\w\-./%~]+$/;

export const BrandLogoInputSchema = z.object({
  src: z.string().regex(LOGO_SRC_RE, "Origen de logo no permitido."),
  ratio: z.number().min(0.2).max(12),
  mode: z.enum(["silhouette", "grayscale"]),
});

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

export const BrandInputSchema = z.object({
  /** null: marca nueva. */
  originalSlug: z.string().nullable(),
  name: z.string().trim().min(1, "Obligatorio.").max(60),
  description: optional(200),
  lines: z.array(z.string().min(1)).max(12),
  logo: BrandLogoInputSchema.nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color en formato #RRGGBB.")
    .nullable()
    .or(z.literal("").transform(() => null)),
  visible: z.boolean(),
});
export type BrandInput = z.input<typeof BrandInputSchema>;

export const BrandsCopyInputSchema = z.object({ label: optional(60), disclaimer: optional(300) });
export type BrandsCopyInput = z.infer<typeof BrandsCopyInputSchema>;

/** Marca en el panel, con cuántos productos la usan. */
export interface BrandDto {
  slug: string;
  name: string;
  description: string | null;
  lines: string[];
  logo: { src: string; ratio: number; mode: BrandLogoMode } | null;
  color: string | null;
  visible: boolean;
  order: number;
  productCount: number;
}

/** Marca tal como la pinta el marquee. */
export interface MarqueeBrandDto {
  name: string;
  logo: { src: string; ratio: number; mode: BrandLogoMode } | null;
  color: string | null;
}

export interface MarqueeDto {
  label: string;
  disclaimer: string;
  brands: MarqueeBrandDto[];
}
