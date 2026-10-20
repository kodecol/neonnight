import { productId, type Product, type ProductMedia, type ProductSpecs } from "@/domain/entities/product";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";

export interface VariantDoc {
  id: string;
  label: string;
  priceCents: number;
  stock: number;
}

export interface ProductDoc {
  _id: string;
  slug: string;
  line: string;
  category: string;
  brand: string;
  model: string;
  reference: string;
  currency: "COP";
  condition: Product["condition"];
  subtitle: string;
  description: string[];
  specs: ProductSpecs;
  variants: VariantDoc[];
  /** Precio de entrada desnormalizado: permite ordenar o filtrar en la base si el catálogo crece. */
  minPriceCents: number;
  media: ProductMedia;
  includes: string[];
  availability: Product["availability"];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductDoc(p: Product, createdAt: Date): ProductDoc {
  return {
    _id: p.id,
    slug: p.slug.value,
    line: p.line,
    category: p.category,
    brand: p.brand,
    model: p.model,
    reference: p.reference.value,
    currency: "COP",
    condition: p.condition,
    subtitle: p.subtitle,
    description: [...p.description],
    specs: structuredClone(p.specs) as ProductSpecs,
    variants: p.variants.map((v) => ({ id: v.id, label: v.label, priceCents: v.price.cents, stock: v.stock })),
    minPriceCents: Math.min(...p.variants.map((v) => v.price.cents)),
    media: structuredClone(p.media) as ProductMedia,
    includes: [...p.includes],
    availability: p.availability,
    featured: p.featured,
    createdAt,
    updatedAt: p.updatedAt,
  };
}

export function fromProductDoc(d: ProductDoc): Product {
  return {
    id: productId(d._id),
    slug: Slug.of(d.slug),
    line: d.line,
    category: d.category,
    brand: d.brand,
    model: d.model,
    reference: Reference.of(d.reference),
    condition: d.condition,
    subtitle: d.subtitle,
    description: d.description,
    specs: d.specs,
    variants: d.variants.map((v) => ({ id: v.id, label: v.label, price: Money.fromCents(v.priceCents, d.currency), stock: v.stock })),
    media: d.media,
    includes: d.includes,
    availability: d.availability,
    featured: d.featured,
    updatedAt: d.updatedAt,
  };
}
