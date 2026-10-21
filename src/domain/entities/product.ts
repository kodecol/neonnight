import type { Money } from "../value-objects/money";
import type { Slug } from "../value-objects/slug";
import type { Reference } from "../value-objects/reference";
import type { CaseMaterialKey, JewelryMetalKey } from "../services/materials";

export type ProductId = string & { readonly __brand: "ProductId" };
export const productId = (value: string): ProductId => value as ProductId;

export const PRODUCT_CONDITIONS = ["nuevo", "como-nuevo", "excelente"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
/** Estado comercial fijado a mano. El stock agotado se deriva de las variantes (ver `productStatus`). */
export const PRODUCT_AVAILABILITIES = ["disponible", "reservado", "vendido"] as const;
export type ProductAvailability = (typeof PRODUCT_AVAILABILITIES)[number];

export const PERFUME_GENDERS = ["femenino", "masculino", "unisex"] as const;
export type PerfumeGender = (typeof PERFUME_GENDERS)[number];

/** Ficha técnica según la plantilla de la línea. `kind` coincide siempre con `ProductLine.template`. */
export interface WatchSpecs {
  readonly kind: "reloj";
  readonly movement: string;
  readonly powerReserveHours: number | null;
  readonly caseMm: number;
  /** Texto que se muestra en la ficha ("Oystersteel", "Oro Everose 18 k"). */
  readonly caseMaterial: string;
  /** Material canónico para filtrar (ver `services/materials.ts`). Ausente en datos antiguos: se deduce del texto. */
  readonly caseMaterialKey?: CaseMaterialKey;
  readonly crystal: string;
  readonly waterResistanceM: number | null;
}

export interface JewelrySpecs {
  readonly kind: "joya";
  /** Texto que se muestra en la ficha ("Oro rosa 18 k"). */
  readonly metal: string;
  /** Metal canónico para filtrar. Ausente en datos antiguos: se deduce del texto. */
  readonly metalKey?: JewelryMetalKey;
  readonly stones: string | null;
  readonly caratTotal: number | null;
  readonly weightGrams: number | null;
  readonly dimensions: string | null;
  readonly certificate: string | null;
}

export interface PerfumeNotes {
  readonly top: readonly string[];
  readonly heart: readonly string[];
  readonly base: readonly string[];
}

export interface PerfumeSpecs {
  readonly kind: "perfume";
  readonly concentration: string;
  readonly gender: PerfumeGender;
  readonly perfumer: string | null;
  readonly year: number | null;
  readonly notes: PerfumeNotes;
}

/** Plantilla libre para líneas nuevas: filas etiqueta/valor. */
export interface GeneralSpecs {
  readonly kind: "general";
  readonly rows: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

export type ProductSpecs = WatchSpecs | JewelrySpecs | PerfumeSpecs | GeneralSpecs;
export type ProductKind = ProductSpecs["kind"];

/**
 * Presentación vendible: talla, mililitros o la única que hay. Todo producto
 * tiene al menos una. `label` vacío = variante única (no se muestra selector).
 */
export interface ProductVariant {
  readonly id: string;
  readonly label: string;
  readonly price: Money;
  readonly stock: number;
}

export interface ProductImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface ProductVideo {
  readonly src: string;
  readonly poster: string;
}

/**
 * Medios de una pieza. `library` es la biblioteca única de fotos (en el orden
 * que eligió el panel); los usos apuntan a fotos de esa biblioteca y una misma
 * foto puede tener varios (portada y banda final, por ejemplo). Ver
 * `services/media-library.ts`.
 */
export interface ProductMedia {
  readonly library: readonly ProductImage[];
  /** Portada: tarjeta del catálogo y cabecera de la ficha si no hay hero. */
  readonly front: ProductImage | null;
  /** Segunda vista: aparece al pasar el cursor por la tarjeta. */
  readonly back: ProductImage | null;
  /** Fondo de la cabecera de la ficha (foto de ambiente o video). */
  readonly hero: ProductImage | ProductVideo | null;
  /** Fotos de la galería, en el orden de la biblioteca. */
  readonly gallery: readonly ProductImage[];
  /** Imagen final: banda a pantalla completa al cierre de la ficha. */
  readonly band: ProductImage | null;
  readonly video: ProductVideo | null;
}

export interface Product {
  readonly id: ProductId;
  readonly slug: Slug;
  /** Slug de la `ProductLine`. */
  readonly line: string;
  /** Slug de una `Category` de esa línea. */
  readonly category: string;
  readonly brand: string;
  readonly model: string;
  readonly reference: Reference;
  readonly condition: ProductCondition;
  readonly subtitle: string;
  readonly description: readonly string[];
  readonly specs: ProductSpecs;
  readonly variants: readonly ProductVariant[];
  readonly media: ProductMedia;
  readonly includes: readonly string[];
  readonly availability: ProductAvailability;
  readonly featured: boolean;
  readonly updatedAt: Date;
}

export const productDisplayName = (p: Pick<Product, "brand" | "model">): string => `${p.brand} ${p.model}`.trim();
