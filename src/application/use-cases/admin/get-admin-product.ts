import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { Product, ProductImage, ProductSpecs } from "@/domain/entities/product";
import type { LineTemplate, ProductLine } from "@/domain/entities/product-line";
import { inferCaseMaterial, inferJewelryMetal } from "@/domain/services/materials";
import { HERO_VIDEO, isVideo, libraryOf } from "@/domain/services/media-library";
import type { AdminImageInput, AdminProductFormDto, ProductSpecsInput } from "../../dto/admin.dto";

const toImage = (img: ProductImage): AdminImageInput => ({ src: img.src, width: img.width, height: img.height, alt: img.alt });

/** Copia editable de la ficha. Datos antiguos sin material canónico lo reciben deducido del texto. */
const cloneSpecs = (s: ProductSpecs): ProductSpecsInput => {
  switch (s.kind) {
    case "perfume":
      return { ...s, notes: { top: [...s.notes.top], heart: [...s.notes.heart], base: [...s.notes.base] } };
    case "general":
      return { kind: "general", rows: s.rows.map((r) => ({ ...r })) };
    case "reloj":
      return { ...s, caseMaterialKey: s.caseMaterialKey ?? inferCaseMaterial(s.caseMaterial) ?? "acero" };
    case "joya":
      return { ...s, metalKey: s.metalKey ?? inferJewelryMetal(s.metal) ?? "otro" };
  }
};

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
      library: libraryOf(p.media).map(toImage),
      roles: {
        front: p.media.front?.src ?? null,
        back: p.media.back?.src ?? null,
        hero: isVideo(p.media.hero) ? HERO_VIDEO : (p.media.hero?.src ?? null),
        band: p.media.band?.src ?? null,
      },
      gallery: p.media.gallery.map((g) => g.src),
    },
    heroVideoPoster: isVideo(p.media.hero) ? p.media.hero.poster : null,
  };
}

export function emptySpecs(template: LineTemplate): ProductSpecsInput {
  switch (template) {
    case "reloj":
      return { kind: "reloj", movement: "", powerReserveHours: null, caseMm: 40, caseMaterial: "", caseMaterialKey: "acero", crystal: "Zafiro", waterResistanceM: null };
    case "joya":
      return { kind: "joya", metal: "", metalKey: "oro-amarillo", stones: null, caratTotal: null, weightGrams: null, dimensions: null, certificate: null };
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
    media: { library: [], roles: { front: null, back: null, hero: null, band: null }, gallery: [] },
    heroVideoPoster: null,
  };
}

export class GetAdminProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<AdminProductFormDto | null> {
    const p = await this.products.findById(id);
    return p ? toAdminProductForm(p) : null;
  }
}
