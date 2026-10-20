import type { Product } from "@/domain/entities/product";
import type { LineTemplate } from "@/domain/entities/product-line";
import { isPurchasable } from "@/domain/services/availability";
import { startingPrice } from "@/domain/services/pricing";
import { GENDER_LABEL } from "./spec-rows";

export interface FacetValue {
  value: string;
  label: string;
}

/**
 * Faceta de filtrado. `values` devuelve los valores de un producto (vacío si
 * no aplica). Las de una sola opción (`multi: false`) se comportan como radio.
 */
export interface FacetDef {
  key: string;
  label: string;
  multi: boolean;
  /** null = todas las plantillas (y la vista de toda la colección). */
  templates: readonly LineTemplate[] | null;
  /** Orden fijo de las opciones; sin él, alfabético. */
  order?: readonly string[];
  /** Interruptor de una sola opción (se muestra aunque solo tenga una). */
  toggle?: boolean;
  values(p: Product): FacetValue[];
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const THOUSAND = 1_000;
const MILLION = 1_000_000;

/** "800 mil", "1,5 millones", "20 millones". */
function amount(units: number): string {
  if (units < MILLION) return `${units / THOUSAND} mil`;
  const m = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(units / MILLION);
  return `${m} ${units === MILLION ? "millón" : "millones"}`;
}

/** Tramos de precio a la medida de cada plantilla: un perfume y un reloj no se filtran igual. */
const PRICE_STEPS: Record<LineTemplate | "todo", number[]> = {
  todo: [2 * MILLION, 10 * MILLION, 35 * MILLION, 100 * MILLION],
  reloj: [20 * MILLION, 60 * MILLION, 150 * MILLION],
  joya: [10 * MILLION, 35 * MILLION],
  perfume: [800 * THOUSAND, 1_500 * THOUSAND],
  general: [1 * MILLION, 5 * MILLION, 20 * MILLION],
};

function priceBuckets(steps: number[]): Array<FacetValue & { max: number }> {
  return [...steps, Infinity].map((max, i) => {
    const min = steps[i - 1];
    if (min === undefined) return { value: `hasta-${max}`, label: `Hasta ${amount(max)}`, max };
    if (max === Infinity) return { value: `desde-${min}`, label: `Más de ${amount(min)}`, max };
    return { value: `${min}-${max}`, label: `De ${amount(min)} a ${amount(max)}`, max };
  });
}

function priceFacet(template: LineTemplate | null): FacetDef {
  const buckets = priceBuckets(PRICE_STEPS[template ?? "todo"]);
  return {
    key: "precio",
    label: "Precio",
    multi: false,
    templates: null,
    order: buckets.map((b) => b.value),
    values: (p) => {
      const units = startingPrice(p).units;
      const b = buckets.find((x) => units <= x.max)!;
      return [{ value: b.value, label: b.label }];
    },
  };
}

function caseBucket(mm: number): FacetValue {
  if (mm < 38.5) return { value: "hasta-38", label: "Hasta 38 mm" };
  if (mm < 41.5) return { value: "39-41", label: "De 39 a 41 mm" };
  return { value: "42-mas", label: "42 mm o más" };
}

/** Agrupa el material de caja en familias que un cliente reconoce. */
function caseMaterialFamily(material: string): FacetValue {
  const m = material.toLowerCase();
  if (m.includes("rolesor") || (m.includes("acero") && m.includes("oro"))) return { value: "acero-y-oro", label: "Acero y oro" };
  if (m.includes("oro") || m.includes("everose")) return { value: "oro", label: "Oro" };
  if (m.includes("titanio")) return { value: "titanio", label: "Titanio" };
  if (m.includes("platino")) return { value: "platino", label: "Platino" };
  if (m.includes("cerámica") || m.includes("ceramica")) return { value: "ceramica", label: "Cerámica" };
  return { value: "acero", label: "Acero" };
}

/** Metal de una joya: color del oro, platino o plata; varias tonalidades → combinado. */
function jewelryMetal(metal: string): FacetValue {
  const m = metal.toLowerCase();
  if (m.includes("platino")) return { value: "platino", label: "Platino" };
  if (m.includes("plata")) return { value: "plata", label: "Plata" };
  const tones = (["amarillo", "blanco", "rosa"] as const).filter((t) => m.includes(t));
  if (tones.length > 1) return { value: "oro-combinado", label: "Oros combinados" };
  if (tones[0]) return { value: `oro-${tones[0]}`, label: `Oro ${tones[0]}` };
  return { value: slug(metal), label: metal };
}

export const FACETS: readonly FacetDef[] = [
  {
    key: "marca",
    label: "Marca",
    multi: true,
    templates: null,
    values: (p) => (p.brand.trim() ? [{ value: slug(p.brand), label: p.brand.trim() }] : []),
  },
  {
    key: "caja",
    label: "Tamaño de caja",
    multi: true,
    templates: ["reloj"],
    order: ["hasta-38", "39-41", "42-mas"],
    values: (p) => (p.specs.kind === "reloj" ? [caseBucket(p.specs.caseMm)] : []),
  },
  {
    key: "material",
    label: "Material",
    multi: true,
    templates: ["reloj"],
    values: (p) => (p.specs.kind === "reloj" ? [caseMaterialFamily(p.specs.caseMaterial)] : []),
  },
  {
    key: "metal",
    label: "Metal",
    multi: true,
    templates: ["joya"],
    values: (p) => (p.specs.kind === "joya" ? [jewelryMetal(p.specs.metal)] : []),
  },
  {
    key: "genero",
    label: "Para",
    multi: true,
    templates: ["perfume"],
    order: ["femenino", "masculino", "unisex"],
    values: (p) => (p.specs.kind === "perfume" ? [{ value: p.specs.gender, label: GENDER_LABEL[p.specs.gender] }] : []),
  },
  {
    key: "concentracion",
    label: "Concentración",
    multi: true,
    templates: ["perfume"],
    values: (p) => (p.specs.kind === "perfume" ? [{ value: slug(p.specs.concentration), label: p.specs.concentration }] : []),
  },
  {
    key: "disponibilidad",
    label: "Disponibilidad",
    multi: false,
    toggle: true,
    templates: null,
    values: (p) => (p.variants.some((v) => isPurchasable(p, v)) ? [{ value: "disponible", label: "Solo disponibles" }] : []),
  },
];

export function facetsFor(template: LineTemplate | null): FacetDef[] {
  const own = FACETS.filter((f) => f.templates === null || (template !== null && f.templates.includes(template)));
  // El precio va segundo, después de la marca.
  return [own[0]!, priceFacet(template), ...own.slice(1)];
}
