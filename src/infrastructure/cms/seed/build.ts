import { productId, type Product, type ProductCondition, type ProductImage, type ProductMedia, type ProductSpecs } from "@/domain/entities/product";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";
import { withLibrary } from "@/domain/services/media-library";

/**
 * Versión del seed. Cada elemento declara desde qué versión existe (`since`):
 * una base ya sembrada solo recibe lo nuevo y nunca se pisa ni se borra lo
 * editado en el panel.
 */
export const SEED_VERSION = 2;

export interface Seeded<T> {
  readonly since: number;
  readonly item: T;
}

export const SEED_UPDATED_AT = new Date("2026-10-20T00:00:00.000Z");

/** Recorte de producto sobre fondo transparente (lienzo cuadrado). */
export const cutout = (src: string, alt: string, width = 1600, height = 1600): ProductImage => ({ src, alt, width, height });

/**
 * Foto de ambiente del producto. Las oscuras protagonizan el hero y se repiten
 * como imagen final (una foto, varios usos); las claras (campañas sobre fondo
 * blanco) van solo como imagen final para no lavar el hero.
 */
export interface SeedEditorial {
  w: number;
  h: number;
  as: "hero" | "band";
}

export function editorialMedia(slug: string, name: string, e: SeedEditorial | undefined): { hero: ProductImage | null; band: ProductImage | null } {
  if (!e) return { hero: null, band: null };
  const img: ProductImage = { src: `/assets/products/${slug}-editorial.webp`, alt: `${name} en ambiente`, width: e.w, height: e.h };
  return e.as === "hero" ? { hero: img, band: img } : { hero: null, band: img };
}

export interface SeedProductInput {
  id: string;
  slug: string;
  line: string;
  category: string;
  brand: string;
  model: string;
  reference: string;
  condition: ProductCondition;
  subtitle: string;
  description: string[];
  includes: string[];
  specs: ProductSpecs;
  /** Sin `id`, se deriva de la etiqueta ("100 ml" → "100-ml"; vacía → "unica"). */
  variants: Array<{ id?: string; label: string; priceUnits: number; stock: number }>;
  media: Partial<ProductMedia> & Pick<ProductMedia, "front" | "back">;
  featured?: boolean;
}

export function buildProduct(i: SeedProductInput): Product {
  return {
    id: productId(i.id),
    slug: Slug.of(i.slug),
    line: i.line,
    category: i.category,
    brand: i.brand,
    model: i.model,
    reference: Reference.of(i.reference),
    condition: i.condition,
    subtitle: i.subtitle,
    description: i.description,
    specs: i.specs,
    variants: i.variants.map((v) => ({
      id: v.id ?? (v.label ? Slug.fromText(v.label).value : "unica"),
      label: v.label,
      price: Money.fromUnits(v.priceUnits),
      stock: v.stock,
    })),
    media: withLibrary({
      hero: null,
      gallery: [i.media.front, i.media.back].filter((x): x is ProductImage => x !== null),
      band: null,
      video: null,
      ...i.media,
    }),
    includes: i.includes,
    availability: "disponible",
    featured: i.featured ?? false,
    updatedAt: SEED_UPDATED_AT,
  };
}
