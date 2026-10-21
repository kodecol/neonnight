import type { Product, WatchSpecs } from "@/domain/entities/product";
import { buildProduct } from "../seed/build";
import { demoBrands, demoFront, demoLine, type DemoBrandInput, type DemoPack } from "./build";

/**
 * Relojería de demo: cuatro casas ficticias y ocho relojes. Precios
 * orientativos en COP; una pieza vendida para que se vea el estado.
 */
export interface WatchRow {
  slug: string;
  brand: string;
  model: string;
  reference: string;
  category: string;
  subtitle: string;
  specs: Omit<WatchSpecs, "kind" | "caseMaterialKey">;
  description: string[];
  priceUnits: number;
  stock: number;
  featured?: boolean;
}

export const WATCH_INCLUDES = ["Estuche de la casa", "Certificado de garantía internacional (2 años)"];

export const WATCH_ROWS: WatchRow[] = [
  {
    slug: "valdes-hijos-cordillera-automatico",
    brand: "Valdés & Hijos",
    model: "Cordillera Automático",
    reference: "VH-1021",
    category: "automatico",
    subtitle: "Automático · 39 mm",
    specs: { movement: "Automático · Cal. VH-21", powerReserveHours: 80, caseMm: 39, caseMaterial: "Acero 316L", crystal: "Zafiro con antirreflejo", waterResistanceM: 100 },
    description: [
      "Un reloj de diario con proporciones clásicas: esfera gris pizarra, índices aplicados y agujas tipo bastón con material luminiscente.",
      "El calibre de la casa entrega 80 horas de reserva de marcha, así que aguanta un fin de semana en la mesa de noche sin detenerse.",
    ],
    priceUnits: 8_900_000,
    stock: 2,
  },
  {
    slug: "valdes-hijos-bahia-200",
    brand: "Valdés & Hijos",
    model: "Bahía 200",
    reference: "VH-2040",
    category: "buceo",
    subtitle: "Buceo · 42 mm",
    specs: { movement: "Automático · Cal. VH-21", powerReserveHours: 80, caseMm: 42, caseMaterial: "Acero 316L", crystal: "Zafiro abombado", waterResistanceM: 200 },
    description: [
      "Bisel unidireccional de cerámica, corona roscada y 200 metros de hermeticidad: todo lo que pide un reloj de buceo, sin exageraciones.",
      "La esfera azul profundo se lee bien bajo el agua y combina igual de bien con una camisa de lino.",
    ],
    priceUnits: 7_400_000,
    stock: 3,
  },
  {
    slug: "maison-orlant-chrono-lumiere",
    brand: "Maison Orlant",
    model: "Chrono Lumière",
    reference: "MO-4120",
    category: "cronografo",
    subtitle: "Cronógrafo · 41 mm",
    specs: { movement: "Automático · Cal. MO-40 de rueda de pilares", powerReserveHours: 60, caseMm: 41, caseMaterial: "Acero y oro amarillo 18 k", crystal: "Zafiro con antirreflejo", waterResistanceM: 100 },
    description: [
      "Cronógrafo de rueda de pilares con pulsadores suaves y precisos, contadores en contraste y escala taquimétrica en el réhaut.",
      "Caja bicolor en acero y oro amarillo: deportivo de corazón, pero con la presencia de un reloj de vestir.",
    ],
    priceUnits: 24_500_000,
    stock: 1,
    featured: true,
  },
  {
    slug: "maison-orlant-ruban-ultraplano",
    brand: "Maison Orlant",
    model: "Ruban Ultraplano",
    reference: "MO-1208",
    category: "vestir",
    subtitle: "Cuerda manual · 38 mm",
    specs: { movement: "Cuerda manual · Cal. MO-12", powerReserveHours: 48, caseMm: 38, caseMaterial: "Oro rosa 18 k", crystal: "Zafiro abombado", waterResistanceM: 30 },
    description: [
      "Apenas 7 milímetros de grosor en oro rosa: se desliza bajo el puño de la camisa sin que se note.",
      "Esfera opalina con minutero ferrocarril y correa de piel de becerro con hebilla en oro a juego.",
    ],
    priceUnits: 38_900_000,
    stock: 1,
  },
  {
    slug: "hartwig-sohn-kaliber-eins",
    brand: "Hartwig & Sohn",
    model: "Kaliber Eins",
    reference: "HS-0100",
    category: "automatico",
    subtitle: "Automático · 40 mm",
    specs: { movement: "Automático · Cal. HS-1", powerReserveHours: 72, caseMm: 40, caseMaterial: "Titanio grado 5", crystal: "Zafiro con antirreflejo", waterResistanceM: 100 },
    description: [
      "Diseño de inspiración instrumental: esfera negra mate, numerales grandes y una legibilidad que no pide explicaciones.",
      "La caja de titanio pesa casi la mitad que una de acero; se olvida en la muñeca incluso en días largos.",
    ],
    priceUnits: 15_800_000,
    stock: 2,
  },
  {
    slug: "hartwig-sohn-regatta-chronograph",
    brand: "Hartwig & Sohn",
    model: "Regatta Chronograph",
    reference: "HS-0420",
    category: "cronografo",
    subtitle: "Cronógrafo · 42 mm",
    specs: { movement: "Automático · Cal. HS-4", powerReserveHours: 56, caseMm: 42, caseMaterial: "Acero 316L", crystal: "Zafiro abombado", waterResistanceM: 100 },
    description: [
      "Un cronógrafo pensado para la vela: cuenta regresiva de cinco minutos en el contador de las 12 y bisel con escala de minutos.",
      "Esfera blanca con acentos rojos y correa de caucho que no le teme al agua salada.",
    ],
    priceUnits: 18_600_000,
    stock: 0,
  },
  {
    slug: "atelier-sauveterre-abysse-300",
    brand: "Atelier Sauveterre",
    model: "Abysse 300",
    reference: "AS-3003",
    category: "buceo",
    subtitle: "Buceo · Bronce · 43 mm",
    specs: { movement: "Automático · Cal. AS-30", powerReserveHours: 72, caseMm: 43, caseMaterial: "Bronce", crystal: "Zafiro abombado", waterResistanceM: 300 },
    description: [
      "Caja de bronce que con el uso toma una pátina propia: no hay dos iguales después de un año en la muñeca.",
      "Esfera verde oliva, válvula de helio y 300 metros de hermeticidad para quien bucea de verdad.",
    ],
    priceUnits: 12_300_000,
    stock: 1,
  },
  {
    slug: "atelier-sauveterre-petite-seconde",
    brand: "Atelier Sauveterre",
    model: "Petite Seconde",
    reference: "AS-1137",
    category: "vestir",
    subtitle: "Cuerda manual · 37 mm",
    specs: { movement: "Cuerda manual · Cal. AS-11", powerReserveHours: 42, caseMm: 37, caseMaterial: "Acero 316L", crystal: "Zafiro abombado", waterResistanceM: 50 },
    description: [
      "Pequeño segundero a las 6, numerales romanos y esfera esmaltada en blanco: el reloj de vestir en su forma más pura.",
      "El fondo de zafiro deja ver el puente del calibre decorado a mano.",
    ],
    priceUnits: 9_600_000,
    stock: 1,
  },
];

export const WATCH_BRANDS: DemoBrandInput[] = [
  { name: "Valdés & Hijos", description: "Taller familiar de relojería mecánica: tres generaciones de oficio y calibres propios." },
  { name: "Maison Orlant", description: "Complicaciones clásicas con cajas finas y acabados a mano." },
  { name: "Hartwig & Sohn", description: "Relojes de inspiración instrumental, sobrios y muy legibles." },
  { name: "Atelier Sauveterre", description: "Casa independiente de relojes de buceo y de vestir, en series cortas." },
];

/** Reloj de demo. `id` y `niche` deciden la imagen (`/assets/demo/<nicho>/<id>.webp`). */
export function watchProduct(row: WatchRow, o: { niche: string; line: string; id: string; featured: boolean }): Product {
  const name = `${row.brand} ${row.model}`;
  return buildProduct({
    id: o.id,
    slug: row.slug,
    line: o.line,
    category: row.category,
    brand: row.brand,
    model: row.model,
    reference: row.reference,
    condition: "nuevo",
    subtitle: row.subtitle,
    description: row.description,
    includes: WATCH_INCLUDES,
    specs: { kind: "reloj", ...row.specs },
    variants: [{ label: "", priceUnits: row.priceUnits, stock: row.stock }],
    media: { front: demoFront(o.niche, o.id, name), back: null },
    featured: o.featured,
  });
}

export const WATCH_LINE = {
  slug: "relojeria",
  label: "Relojería",
  description: "Automáticos, cronógrafos y relojes de vestir, revisados uno a uno antes de llegar a tu muñeca.",
  template: "reloj",
  coverAlt: "Silueta de un reloj sobre fondo oscuro",
} as const;

const NICHE = "relojeria";
const products = WATCH_ROWS.map((row, i) =>
  watchProduct(row, { niche: NICHE, line: WATCH_LINE.slug, id: `demo-rj-${String(i + 1).padStart(2, "0")}`, featured: row.featured ?? false }),
);

export const RELOJERIA: DemoPack = {
  lines: [demoLine(NICHE, { ...WATCH_LINE, order: 1 })],
  categories: [
    { slug: "automatico", label: "Automáticos", order: 1, line: "relojeria" },
    { slug: "cronografo", label: "Cronógrafos", order: 2, line: "relojeria" },
    { slug: "buceo", label: "Buceo", order: 3, line: "relojeria" },
    { slug: "vestir", label: "Vestir", order: 4, line: "relojeria" },
  ],
  brands: demoBrands(WATCH_BRANDS, products),
  products,
};
