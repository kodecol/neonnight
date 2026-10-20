import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { Product, ProductImage, ProductSpecs } from "@/domain/entities/product";
import type { LineTemplate, ProductLine } from "@/domain/entities/product-line";
import type { AdminImageInput, AdminProductFormDto, ProductSpecsInput } from "../../dto/admin.dto";

const toImage = (img: ProductImage): AdminImageInput => ({ src: img.src, width: img.width, height: img.height, alt: img.alt });

const cloneSpecs = (s: ProductSpecs): ProductSpecsInput =>
  s.kind === "perfume"
    ? { ...s, notes: { top: [...s.notes.top], heart: [...s.notes.heart], base: [...s.notes.base] } }
    : s.kind === "general"
      ? { kind: "general", rows: s.rows.map((r) => ({ ...r })) }
      : { ...s };

export function toAdminProductForm(p: Product): AdminProductFormDto {
  return {
    id: p.id,
    line: p.line,
    category: p.category,
    brand: p.brand,
    model: p.model,
    reference: p.reference.value,
    slug: p.slug.value,
    condition: p.condition,
    availability: p.availability,
    featured: p.featured,
    subtitle: p.subtitle,
    description: [...p.description],
    includes: [...p.includes],
    specs: cloneSpecs(p.specs),
    variants: p.variants.map((v) => ({ id: v.id, label: v.label, priceUnits: v.price.units, stock: v.stock })),
    media: {
      front: p.media.front ? toImage(p.media.front) : null,
      back: p.media.back ? toImage(p.media.back) : null,
      gallery: p.media.gallery.map(toImage),
    },
  };
}

export function emptySpecs(template: LineTemplate): ProductSpecsInput {
  switch (template) {
    case "reloj":
      return { kind: "reloj", movement: "", powerReserveHours: null, caseMm: 40, caseMaterial: "", crystal: "Zafiro", waterResistanceM: null };
    case "joya":
      return { kind: "joya", metal: "", stones: null, caratTotal: null, weightGrams: null, dimensions: null, certificate: null };
    case "perfume":
      return { kind: "perfume", concentration: "Eau de Parfum", gender: "unisex", perfumer: null, year: null, notes: { top: [], heart: [], base: [] } };
    case "general":
      return { kind: "general", rows: [] };
  }
}

/** Formulario vacío para un producto nuevo de la línea dada. */
export function emptyAdminProductForm(line: ProductLine, defaultCategory: string): AdminProductFormDto {
  const perfume = line.template === "perfume";
  return {
    id: null,
    line: line.slug,
    category: defaultCategory,
    brand: "",
    model: "",
    reference: "",
    slug: "",
    condition: "nuevo",
    availability: "disponible",
    featured: false,
    subtitle: "",
    description: [],
    includes: line.template === "reloj" ? ["Caja y papeles"] : line.template === "joya" ? ["Estuche original", "Certificado de autenticidad"] : [],
    specs: emptySpecs(line.template),
    variants: perfume
      ? [
          { id: null, label: "50 ml", priceUnits: 0, stock: 0 },
          { id: null, label: "100 ml", priceUnits: 0, stock: 0 },
        ]
      : [{ id: null, label: "", priceUnits: 0, stock: 1 }],
    media: { front: null, back: null, gallery: [] },
  };
}

export class GetAdminProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<AdminProductFormDto | null> {
    const p = await this.products.findById(id);
    return p ? toAdminProductForm(p) : null;
  }
}
