import type { Product } from "@/domain/entities/product";
import type { LineTemplate } from "@/domain/entities/product-line";
import { isPurchasable } from "@/domain/services/availability";
import { CASE_MATERIALS, JEWELRY_METALS, inferCaseMaterial, inferJewelryMetal } from "@/domain/services/materials";
import { GENDER_LABEL } from "./spec-rows";
import { bucketIndex, bucketsFromCuts, quantileCuts } from "./ranges";

export interface FacetValue {
  value: string;
  label: string;
}

/**
 * Faceta de filtrado. `values` devuelve los valores de un producto (vacío si
 * no aplica). Las de una sola opción (`multi: false`) se comportan como radio.
 * El precio no es una faceta: es un rango aparte (ver `BrowseCatalog`).
 */
export interface FacetDef {
  key: string;
  label: string;
  multi: boolean;
  /** Orden fijo de las opciones; sin él, alfabético. */
  order?: readonly string[];
  /** Interruptor de una sola opción (se muestra aunque solo tenga una). */
  toggle?: boolean;
  values(p: Product): FacetValue[];
}

/** Marca tal como la define el catálogo de marcas (cuando exista): nombre visible y orden. */
export interface BrandEntry {
  name: string;
  order?: number;
}

export const slugOf = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const num = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(n);

/** Mililitros de una presentación ("100 ml", "Eau de Parfum 50 ml"). */
export const mlOf = (label: string): number | null => {
  const m = /(\d+(?:[.,]\d+)?)\s*ml\b/i.exec(label);
  return m ? Number(m[1]!.replace(",", ".")) : null;
};

/**
 * Faceta numérica a partir de los valores reales de la vista: con pocos
 * valores distintos (≤ 8) cada uno es una opción ("40 mm"); con más, tramos
 * por cuantiles ("Hasta 38 mm", "De 38 a 41 mm", "Más de 41 mm", extremo
 * superior inclusivo).
 */
function numericFacet(key: string, label: string, unit: string, valuesOf: (p: Product) => number[], scope: readonly Product[]): FacetDef {
  const all = scope.flatMap(valuesOf);
  const distinct = [...new Set(all)].sort((a, b) => a - b);
  if (distinct.length <= 8) {
    const id = (v: number) => String(v).replace(".", "_");
    return {
      key,
      label,
      multi: true,
      order: distinct.map(id),
      values: (p) => [...new Set(valuesOf(p))].map((v) => ({ value: id(v), label: `${num(v)} ${unit}` })),
    };
  }
  const cuts = quantileCuts(all, (x) => Math.round(x), 3);
  const buckets = bucketsFromCuts(cuts).map(({ lo, hi }) => ({
    value: lo === null ? `hasta-${hi}` : hi === null ? `desde-${lo}` : `${lo}-${hi}`,
    label: lo === null ? `Hasta ${num(hi!)} ${unit}` : hi === null ? `Más de ${num(lo)} ${unit}` : `De ${num(lo)} a ${num(hi)} ${unit}`,
  }));
  return {
    key,
    label,
    multi: true,
    order: buckets.map((b) => b.value),
    values: (p) => [...new Set(valuesOf(p).map((v) => bucketIndex(v, cuts)))].map((i) => buckets[i]!),
  };
}

function brandFacet(brands: readonly BrandEntry[] | undefined, scope: readonly Product[]): FacetDef {
  const directory = new Map((brands ?? []).map((b, i) => [slugOf(b.name), { name: b.name, order: b.order ?? i }]));
  const present = [...new Set(scope.map((p) => slugOf(p.brand)).filter(Boolean))];
  // Primero el orden del catálogo de marcas; las que no estén en él, alfabéticas al final.
  const order = present.sort((a, b) => {
    const oa = directory.get(a)?.order ?? Infinity;
    const ob = directory.get(b)?.order ?? Infinity;
    return oa !== ob ? oa - ob : a.localeCompare(b, "es");
  });
  return {
    key: "marca",
    label: "Marca",
    multi: true,
    order,
    values: (p) => {
      const value = slugOf(p.brand);
      return value ? [{ value, label: directory.get(value)?.name ?? p.brand.trim() }] : [];
    },
  };
}

/** Material de la caja: el campo estructurado o, en datos antiguos, el deducido del texto. */
function caseMaterialValue(p: Product): FacetValue[] {
  if (p.specs.kind !== "reloj") return [];
  const key = p.specs.caseMaterialKey ?? inferCaseMaterial(p.specs.caseMaterial);
  if (!key) return [];
  if (key === "otro") return p.specs.caseMaterial.trim() ? [{ value: slugOf(p.specs.caseMaterial), label: p.specs.caseMaterial.trim() }] : [];
  return [{ value: key, label: CASE_MATERIALS[key] }];
}

function jewelryMetalValue(p: Product): FacetValue[] {
  if (p.specs.kind !== "joya") return [];
  const key = p.specs.metalKey ?? inferJewelryMetal(p.specs.metal);
  if (!key) return [];
  if (key === "otro") return p.specs.metal.trim() ? [{ value: slugOf(p.specs.metal), label: p.specs.metal.trim() }] : [];
  return [{ value: key, label: JEWELRY_METALS[key] }];
}

/**
 * Facetas de una vista (toda la colección o una línea), construidas con los
 * productos de esa vista: las opciones, los tramos numéricos y el orden de
 * las marcas salen de los datos, no de listas fijas.
 */
export function facetsFor(template: LineTemplate | null, scope: readonly Product[], opts: { brands?: readonly BrandEntry[] } = {}): FacetDef[] {
  const defs: FacetDef[] = [brandFacet(opts.brands, scope)];
  if (template === "reloj") {
    defs.push(numericFacet("caja", "Tamaño de caja", "mm", (p) => (p.specs.kind === "reloj" && p.specs.caseMm > 0 ? [p.specs.caseMm] : []), scope));
    defs.push({ key: "material", label: "Material", multi: true, order: Object.keys(CASE_MATERIALS), values: caseMaterialValue });
  }
  if (template === "joya") {
    defs.push({ key: "metal", label: "Metal", multi: true, order: Object.keys(JEWELRY_METALS), values: jewelryMetalValue });
  }
  if (template === "perfume") {
    defs.push({
      key: "genero",
      label: "Para",
      multi: true,
      order: ["femenino", "masculino", "unisex"],
      values: (p) => (p.specs.kind === "perfume" ? [{ value: p.specs.gender, label: GENDER_LABEL[p.specs.gender] }] : []),
    });
    defs.push({
      key: "concentracion",
      label: "Concentración",
      multi: true,
      values: (p) => (p.specs.kind === "perfume" && p.specs.concentration.trim() ? [{ value: slugOf(p.specs.concentration), label: p.specs.concentration.trim() }] : []),
    });
    defs.push(numericFacet("ml", "Tamaño", "ml", (p) => p.variants.map((v) => mlOf(v.label)).filter((n): n is number => n !== null), scope));
  }
  defs.push({
    key: "disponibilidad",
    label: "Disponibilidad",
    multi: false,
    toggle: true,
    values: (p) => (p.variants.some((v) => isPurchasable(p, v)) ? [{ value: "disponible", label: "Solo disponibles" }] : []),
  });
  return defs;
}
