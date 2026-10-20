import { z } from "zod";
import { WATCH_AVAILABILITIES, WATCH_CONDITIONS, type WatchAvailability, type WatchCondition } from "@/domain/entities/watch";
import type { PaymentMode } from "../ports/payment-settings";

/** Solo se aceptan fotos propias: assets del repo, subidas locales o Cloudinary. */
const IMAGE_SRC_RE = /^(\/assets\/|\/api\/media\/|https:\/\/res\.cloudinary\.com\/)/;

export const AdminImageInputSchema = z.object({
  src: z.string().regex(IMAGE_SRC_RE, "Origen de imagen no permitido."),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().trim().max(160).optional(),
});
export type AdminImageInput = z.infer<typeof AdminImageInputSchema>;

const text = (max: number, msg = "Obligatorio.") => z.string().trim().min(1, msg).max(max);
const optionalInt = z.number().int().nonnegative().nullable();

export const AdminWatchInputSchema = z.object({
  id: z.string().min(1).nullable(),
  brand: text(60),
  model: text(80),
  reference: text(40),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones."),
  priceUnits: z.number({ error: "Precio inválido." }).int("Sin decimales.").positive("Debe ser mayor que 0.").max(100_000_000_000),
  category: text(60, "Elige una categoría."),
  condition: z.enum(WATCH_CONDITIONS),
  availability: z.enum(WATCH_AVAILABILITIES),
  featured: z.boolean(),
  subtitle: text(120),
  description: z.array(z.string().trim().min(1)).max(12),
  includes: z.array(z.string().trim().min(1)).max(12),
  specs: z.object({
    movement: text(120),
    powerReserveHours: optionalInt,
    caseMm: z.number({ error: "Medida inválida." }).positive("Debe ser mayor que 0.").max(80),
    caseMaterial: text(80),
    crystal: text(60),
    waterResistanceM: optionalInt,
  }),
  media: z.object({
    front: AdminImageInputSchema.nullable(),
    back: AdminImageInputSchema.nullable(),
    gallery: z.array(AdminImageInputSchema).max(12),
  }),
});
export type AdminWatchInput = z.infer<typeof AdminWatchInputSchema>;

/** Forma del formulario de producto (lo que el panel edita). */
export interface AdminWatchFormDto {
  id: string | null;
  brand: string;
  model: string;
  reference: string;
  slug: string;
  priceUnits: number;
  category: string;
  condition: WatchCondition;
  availability: WatchAvailability;
  featured: boolean;
  subtitle: string;
  description: string[];
  includes: string[];
  specs: {
    movement: string;
    powerReserveHours: number | null;
    caseMm: number;
    caseMaterial: string;
    crystal: string;
    waterResistanceM: number | null;
  };
  media: { front: AdminImageInput | null; back: AdminImageInput | null; gallery: AdminImageInput[] };
}

/** Fila de la lista del catálogo en el panel. */
export interface AdminWatchRowDto {
  id: string;
  slug: string;
  name: string;
  reference: string;
  priceFormatted: string;
  category: string;
  categoryLabel: string;
  availability: WatchAvailability;
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
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export interface CategoryDto {
  slug: string;
  label: string;
  order: number;
  watchCount: number;
}

export const PaymentSettingsInputSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["pruebas", "produccion"]),
  identityKey: z.string().trim().max(200),
  /** Vacío = conservar la llave guardada. */
  secretKey: z.string().trim().max(200),
});
export type PaymentSettingsInput = z.infer<typeof PaymentSettingsInputSchema>;

export interface PaymentSettingsViewDto {
  enabled: boolean;
  mode: PaymentMode;
  identityKey: string;
  /** `••••1234` o null si no hay llave. */
  secretKeyHint: string | null;
  ready: boolean;
  updatedAt: string | null;
}

export interface OrderStatusDto {
  id: string;
  status: "pendiente" | "pagada" | "fallida" | "cancelada";
  totalFormatted: string;
}

/** Resultado uniforme de las acciones del panel. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
