import { z } from "zod";
import { CASE_MATERIAL_KEYS, JEWELRY_METAL_KEYS, type CaseMaterialKey, type JewelryMetalKey } from "@/domain/services/materials";
import {
  PERFUME_GENDERS,
  PRODUCT_AVAILABILITIES,
  PRODUCT_CONDITIONS,
  type ProductAvailability,
  type ProductCondition,
} from "@/domain/entities/product";
import { LINE_TEMPLATES, type LineTemplate } from "@/domain/entities/product-line";
import type { PaymentMode } from "../ports/payment-settings";
import type { StatusDto } from "./product.dto";

/** Solo se aceptan fotos propias: assets del repo, subidas locales o Cloudinary. */
const IMAGE_SRC_RE = /^(\/assets\/|\/api\/media\/|https:\/\/res\.cloudinary\.com\/)/;

export const AdminImageInputSchema = z.object({
  src: z.string().regex(IMAGE_SRC_RE, "Origen de imagen no permitido."),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().trim().max(160).optional(),
});
export type AdminImageInput = z.infer<typeof AdminImageInputSchema>;

/** Usos de una foto en la ficha. "video" en `hero` conserva el video que ya tiene la pieza. */
export const MEDIA_ROLE_KEYS = ["front", "back", "hero", "band"] as const;
export type MediaRoleKey = (typeof MEDIA_ROLE_KEYS)[number];

/**
 * Biblioteca única de fotos de la pieza y los usos asignados (por `src`).
 * Una misma foto puede tener varios usos; cada uso, una sola foto.
 */
export const AdminMediaInputSchema = z
  .object({
    library: z.array(AdminImageInputSchema).max(24, "Máximo 24 fotos por pieza."),
    roles: z.object({ front: z.string().nullable(), back: z.string().nullable(), hero: z.string().nullable(), band: z.string().nullable() }),
    gallery: z.array(z.string()).max(24),
  })
  .superRefine((m, ctx) => {
    const srcs = new Set<string>();
    m.library.forEach((img, i) => {
      if (srcs.has(img.src)) ctx.addIssue({ code: "custom", path: ["library", i], message: "Foto repetida." });
      srcs.add(img.src);
    });
    for (const role of MEDIA_ROLE_KEYS) {
      const v = m.roles[role];
      if (v !== null && !(role === "hero" && v === "video") && !srcs.has(v)) ctx.addIssue({ code: "custom", path: ["roles", role], message: "La foto asignada ya no está en la biblioteca." });
    }
    m.gallery.forEach((src, i) => {
      if (!srcs.has(src)) ctx.addIssue({ code: "custom", path: ["gallery", i], message: "La foto de la galería ya no está en la biblioteca." });
    });
  });
export type AdminMediaInput = z.infer<typeof AdminMediaInputSchema>;

const text = (max: number, msg = "Obligatorio.") => z.string().trim().min(1, msg).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().transform((v) => (v ? v : null));
const optionalInt = z.number().int().nonnegative().nullable();
const optionalDecimal = z.number().nonnegative().nullable();
const noteList = z.array(z.string().trim().min(1).max(40)).max(12);

export const WatchSpecsInputSchema = z.object({
  kind: z.literal("reloj"),
  movement: text(120),
  powerReserveHours: optionalInt,
  caseMm: z.number({ error: "Medida inválida." }).positive("Debe ser mayor que 0.").max(80),
  caseMaterial: text(80),
  /** Material canónico para los filtros de la tienda. */
  caseMaterialKey: z.enum(CASE_MATERIAL_KEYS as [CaseMaterialKey, ...CaseMaterialKey[]], { message: "Elige el material." }),
  crystal: text(60),
  waterResistanceM: optionalInt,
});

export const JewelrySpecsInputSchema = z.object({
  kind: z.literal("joya"),
  metal: text(80),
  /** Metal canónico para los filtros de la tienda. */
  metalKey: z.enum(JEWELRY_METAL_KEYS as [JewelryMetalKey, ...JewelryMetalKey[]], { message: "Elige el metal." }),
  stones: optionalText(120),
  caratTotal: optionalDecimal,
  weightGrams: optionalDecimal,
  dimensions: optionalText(80),
  certificate: optionalText(80),
});

export const PerfumeSpecsInputSchema = z.object({
  kind: z.literal("perfume"),
  concentration: text(40),
  gender: z.enum(PERFUME_GENDERS),
  perfumer: optionalText(80),
  year: z.number().int().min(1800).max(2100).nullable(),
  notes: z.object({ top: noteList, heart: noteList, base: noteList }),
});

export const GeneralSpecsInputSchema = z.object({
  kind: z.literal("general"),
  rows: z.array(z.object({ label: text(40), value: text(120) })).max(16),
});

export const ProductSpecsInputSchema = z.discriminatedUnion("kind", [WatchSpecsInputSchema, JewelrySpecsInputSchema, PerfumeSpecsInputSchema, GeneralSpecsInputSchema]);
export type ProductSpecsInput = z.infer<typeof ProductSpecsInputSchema>;

export const AdminVariantInputSchema = z.object({
  /** null = variante nueva. */
  id: z.string().min(1).nullable(),
  label: z.string().trim().max(40),
  priceUnits: z.number({ error: "Precio inválido." }).int("Sin decimales.").positive("Debe ser mayor que 0.").max(100_000_000_000),
  stock: z.number({ error: "Stock inválido." }).int("Sin decimales.").min(0, "No puede ser negativo.").max(9999),
});
export type AdminVariantInput = z.infer<typeof AdminVariantInputSchema>;

export const AdminProductInputSchema = z.object({
  id: z.string().min(1).nullable(),
  line: text(60, "Elige una línea."),
  category: text(60, "Elige una categoría."),
  brand: text(60),
  model: text(80),
  reference: z.string().trim().max(40),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones."),
  condition: z.enum(PRODUCT_CONDITIONS),
  availability: z.enum(PRODUCT_AVAILABILITIES),
  featured: z.boolean(),
  subtitle: text(120),
  description: z.array(z.string().trim().min(1)).max(12),
  includes: z.array(z.string().trim().min(1)).max(12),
  specs: ProductSpecsInputSchema,
  variants: z.array(AdminVariantInputSchema).min(1, "Añade al menos una presentación.").max(12),
  media: AdminMediaInputSchema,
});
export type AdminProductInput = z.infer<typeof AdminProductInputSchema>;

/** Forma del formulario de producto (lo que el panel edita) y lo que solo muestra. */
export type AdminProductFormDto = AdminProductInput & {
  /** Poster del video del hero, si la pieza lo tiene (el video no se sube desde el panel). */
  heroVideoPoster: string | null;
};

/** Fila de la lista del catálogo en el panel. */
export interface AdminProductRowDto {
  id: string;
  slug: string;
  kind: LineTemplate;
  name: string;
  reference: string;
  line: string;
  lineLabel: string;
  category: string;
  categoryLabel: string;
  priceFormatted: string;
  priceFrom: boolean;
  stock: number;
  variantCount: number;
  status: StatusDto;
  featured: boolean;
  thumb: string | null;
  updatedAt: string;
}

export const CategoryInputSchema = z.object({
  /** null = alta nueva (el slug se genera del nombre si viene vacío). */
  originalSlug: z.string().nullable(),
  slug: z.string().trim(),
  label: text(40),
  order: z.number({ error: "Orden inválido." }).int().min(0).max(999),
  line: text(60, "Elige una línea."),
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export interface CategoryDto {
  slug: string;
  label: string;
  order: number;
  line: string;
  productCount: number;
}

export const LineInputSchema = z.object({
  /** null = alta nueva (el slug se genera del nombre si viene vacío). */
  originalSlug: z.string().nullable(),
  slug: z.string().trim(),
  label: text(40),
  description: z.string().trim().max(160),
  order: z.number({ error: "Orden inválido." }).int().min(0).max(999),
  template: z.enum(LINE_TEMPLATES),
  cover: AdminImageInputSchema.nullable(),
});
export type LineInput = z.infer<typeof LineInputSchema>;

export interface AdminLineDto {
  slug: string;
  label: string;
  description: string;
  order: number;
  template: LineTemplate;
  cover: AdminImageInput | null;
  productCount: number;
  categoryCount: number;
}

export const TEMPLATE_LABEL: Record<LineTemplate, string> = { reloj: "Reloj", joya: "Joya", perfume: "Perfume", general: "General" };

export const PaymentSettingsInputSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["pruebas", "produccion"]),
  identityKey: z.string().trim().max(200),
  /** Vacío = conservar la llave guardada. */
  secretKey: z.string().trim().max(200),
  /** Pedidos sin pasarela cuando Bold está inactivo. */
  manualEnabled: z.boolean(),
  manualInstructions: z.string().trim().min(20, "Explica en una o dos frases cómo se coordina el pago.").max(600),
});
export type PaymentSettingsInput = z.infer<typeof PaymentSettingsInputSchema>;

export interface PaymentSettingsViewDto {
  enabled: boolean;
  mode: PaymentMode;
  identityKey: string;
  /** `••••1234` o null si no hay llave. */
  secretKeyHint: string | null;
  ready: boolean;
  manualEnabled: boolean;
  manualInstructions: string;
  updatedAt: string | null;
}

export interface OrderStatusDto {
  id: string;
  status: "pendiente" | "pagada" | "fallida" | "cancelada";
  totalFormatted: string;
  totalCents: number;
  paymentMethod: "bold" | "manual";
  /** Para registrar la compra en analítica (sin datos del comprador). */
  lines: Array<{ productId: string; name: string; variantLabel: string; unitPriceCents: number; quantity: number }>;
}

/** Resultado uniforme de las acciones del panel. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type { ProductAvailability, ProductCondition };
