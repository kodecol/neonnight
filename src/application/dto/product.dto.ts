import type { Product, ProductCondition, ProductImage, ProductKind, ProductVideo } from "@/domain/entities/product";
import { productDisplayName } from "@/domain/entities/product";
import { SALE_MODE, type SaleMode } from "@/domain/entities/product-line";
import { MAX_QUANTITY_PER_LINE, isPurchasable, productStatus, type ProductStatus } from "@/domain/services/availability";
import { hasPriceRange, startingPrice } from "@/domain/services/pricing";
import type { Money } from "@/domain/value-objects/money";
import { specRows } from "../lib/spec-rows";

export interface ImageDto {
  src: string;
  alt: string;
  width: number;
  height: number;
}
export interface VideoDto {
  src: string;
  poster: string;
}
export type HeroMediaDto = { kind: "image"; image: ImageDto } | { kind: "video"; video: VideoDto } | null;

export interface PriceDto {
  cents: number;
  units: number;
  currency: "COP";
  formatted: string;
}

export interface StatusDto {
  code: ProductStatus;
  label: string;
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  disponible: "Disponible",
  ultimas: "Últimas unidades",
  reservado: "Reservado",
  vendido: "Vendido",
  agotado: "Agotado",
};

const CONDITION_LABEL: Record<ProductCondition, string> = { nuevo: "Nuevo", "como-nuevo": "Como nuevo", excelente: "Excelente" };

/** Forma mínima para tarjetas de grilla. */
export interface ProductSummaryDto {
  id: string;
  slug: string;
  kind: ProductKind;
  line: string;
  category: string;
  brand: string;
  model: string;
  name: string;
  /** Referencia de fabricante; vacía si no aplica (p. ej. perfumes). */
  reference: string;
  subtitle: string;
  /** Precio de entrada (el menor con stock). */
  price: PriceDto;
  /** Las variantes tienen precios distintos: se antepone "Desde". */
  priceFrom: boolean;
  status: StatusDto;
  purchasable: boolean;
  /** Variante que la tarjeta puede añadir directo; null si hay que elegir presentación. */
  quickVariant: { id: string; label: string; maxQuantity: number } | null;
  front: ImageDto | null;
  back: ImageDto | null;
}

export interface VariantDto {
  id: string;
  label: string;
  price: PriceDto;
  stock: number;
  purchasable: boolean;
  /** Cantidad máxima que admite la bolsa para esta variante. */
  maxQuantity: number;
}

export interface SpecRowDto {
  label: string;
  value: string;
}

/** Forma completa para la página de detalle. */
export interface ProductDetailDto extends ProductSummaryDto {
  condition: ProductCondition;
  conditionLabel: string;
  saleMode: SaleMode;
  description: string[];
  specs: SpecRowDto[];
  /** Pirámide olfativa (solo perfumes). */
  notes: { top: string[]; heart: string[]; base: string[] } | null;
  includes: string[];
  variants: VariantDto[];
  hero: HeroMediaDto;
  gallery: ImageDto[];
  band: ImageDto | null;
  video: VideoDto | null;
  updatedAt: string;
}

/** Una pieza se vende de a una aunque haya varias de la misma talla; lo demás, hasta el tope de la bolsa. */
const maxQuantity = (mode: SaleMode, stock: number) => Math.min(mode === "pieza" ? 1 : MAX_QUANTITY_PER_LINE, stock);

const toImage = (img: ProductImage | null): ImageDto | null => (img ? { ...img } : null);
const toVideo = (v: ProductVideo | null): VideoDto | null => (v ? { ...v } : null);

const isVideo = (m: ProductImage | ProductVideo): m is ProductVideo => "poster" in m;

export function toPriceDto(price: Money): PriceDto {
  return { cents: price.cents, units: price.units, currency: price.currency, formatted: price.format() };
}

export function toProductSummaryDto(p: Product): ProductSummaryDto {
  const mode = SALE_MODE[p.specs.kind];
  const status = productStatus(p, mode);
  const only = p.variants.length === 1 ? p.variants[0]! : null;
  return {
    id: p.id,
    slug: p.slug.value,
    kind: p.specs.kind,
    line: p.line,
    category: p.category,
    brand: p.brand,
    model: p.model,
    name: productDisplayName(p),
    reference: p.reference.value,
    subtitle: p.subtitle,
    price: toPriceDto(startingPrice(p)),
    priceFrom: hasPriceRange(p),
    status: { code: status, label: STATUS_LABEL[status] },
    purchasable: p.variants.some((v) => isPurchasable(p, v)),
    quickVariant: only ? { id: only.id, label: only.label, maxQuantity: maxQuantity(mode, only.stock) } : null,
    front: toImage(p.media.front),
    back: toImage(p.media.back),
  };
}

export function toProductDetailDto(p: Product): ProductDetailDto {
  const hero = p.media.hero;
  const saleMode = SALE_MODE[p.specs.kind];
  return {
    ...toProductSummaryDto(p),
    condition: p.condition,
    conditionLabel: p.specs.kind === "perfume" && p.condition === "nuevo" ? "Nuevo, sellado" : CONDITION_LABEL[p.condition],
    saleMode,
    description: [...p.description],
    specs: specRows(p),
    notes: p.specs.kind === "perfume" ? { top: [...p.specs.notes.top], heart: [...p.specs.notes.heart], base: [...p.specs.notes.base] } : null,
    includes: [...p.includes],
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: toPriceDto(v.price),
      stock: v.stock,
      purchasable: isPurchasable(p, v),
      maxQuantity: maxQuantity(saleMode, v.stock),
    })),
    hero: hero === null ? null : isVideo(hero) ? { kind: "video", video: { ...hero } } : { kind: "image", image: { ...hero } },
    gallery: p.media.gallery.map((g) => ({ ...g })),
    band: toImage(p.media.band),
    video: toVideo(p.media.video),
    updatedAt: p.updatedAt.toISOString(),
  };
}
