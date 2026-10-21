import { brandKey, type Brand } from "@/domain/entities/brand";
import type { Category } from "@/domain/entities/category";
import type { Product, ProductImage } from "@/domain/entities/product";
import type { LineTemplate, ProductLine } from "@/domain/entities/product-line";
import { Slug } from "@/domain/value-objects/slug";

/**
 * Catálogo de demo de un nicho: lo que `seed --niche` inserta en una instancia
 * nueva de la plantilla. Todo es ficticio (casas, modelos, referencias y
 * perfumistas inventados) y las fotos son siluetas neutras generadas por
 * `scripts/generate-demo-images.mjs`; el cliente las reemplaza desde /admin.
 */
export interface DemoPack {
  readonly lines: ProductLine[];
  readonly categories: Category[];
  readonly brands: Brand[];
  readonly products: Product[];
}

/** Tamaño de todas las imágenes de demo (frontales y portadas). */
export const DEMO_IMAGE = { width: 1120, height: 1400 } as const;

/** Imagen de demo de un nicho: `/assets/demo/<nicho>/<archivo>.webp`. */
export const demoImage = (niche: string, file: string, alt: string): ProductImage => ({
  src: `/assets/demo/${niche}/${file}.webp`,
  alt,
  ...DEMO_IMAGE,
});

/** Frontal de un producto: el archivo se llama como su id (`demo-rj-01.webp`). */
export const demoFront = (niche: string, id: string, name: string): ProductImage => demoImage(niche, id, `${name}, imagen de demostración`);

export interface DemoLineInput {
  slug: string;
  label: string;
  description: string;
  order: number;
  template: LineTemplate;
  /** Qué muestra la portada, para el texto alternativo. */
  coverAlt: string;
}

/** Línea con su portada (`portada-<slug>.webp`). */
export const demoLine = (niche: string, l: DemoLineInput): ProductLine => ({
  slug: l.slug,
  label: l.label,
  description: l.description,
  order: l.order,
  template: l.template,
  cover: demoImage(niche, `portada-${l.slug}`, l.coverAlt),
});

export interface DemoBrandInput {
  name: string;
  description: string;
}

/**
 * Marcas del pack en el orden dado, con las líneas donde venden según los
 * productos. Sin logo (el cliente sube el suyo) y con el blanco por defecto
 * al pasar el cursor.
 */
export function demoBrands(entries: readonly DemoBrandInput[], products: readonly Product[]): Brand[] {
  return entries.map((b, i) => ({
    slug: Slug.fromText(b.name).value,
    name: b.name,
    lines: [...new Set(products.filter((p) => brandKey(p.brand) === brandKey(b.name)).map((p) => p.line))].sort(),
    logo: null,
    color: null,
    visible: true,
    order: i + 1,
    description: b.description,
  }));
}

/** Busca una fila por slug; un slug que no existe es un error del pack. */
export function pick<T extends { slug: string }>(rows: readonly T[], slug: string): T {
  const row = rows.find((r) => r.slug === slug);
  if (!row) throw new Error(`Fila de demo inexistente: ${slug}`);
  return row;
}
