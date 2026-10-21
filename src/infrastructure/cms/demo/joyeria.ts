import type { JewelrySpecs, Product } from "@/domain/entities/product";
import { buildProduct } from "../seed/build";
import { demoBrands, demoFront, demoLine, type DemoBrandInput, type DemoPack } from "./build";

/**
 * Joyería de demo: cuatro casas ficticias y ocho piezas. Las tallas son
 * variantes con su propio stock; una pieza vendida en todas sus tallas.
 */
export interface JewelryRow {
  slug: string;
  brand: string;
  model: string;
  reference: string;
  category: string;
  subtitle: string;
  specs: Omit<JewelrySpecs, "kind" | "metalKey">;
  description: string[];
  variants: Array<{ label: string; priceUnits: number; stock: number }>;
  featured?: boolean;
}

export const JEWELRY_INCLUDES = ["Estuche de la casa", "Certificado de autenticidad"];

export const JEWELRY_ROWS: JewelryRow[] = [
  {
    slug: "maison-ardent-solitario-aurora",
    brand: "Maison Ardent",
    model: "Solitario Aurora",
    reference: "MA-S050",
    category: "anillos",
    subtitle: "Oro blanco 18 k · Diamante 0,50 ct",
    specs: {
      metal: "Oro blanco 18 k",
      stones: "Diamante talla brillante, color G, pureza VS1",
      caratTotal: 0.5,
      weightGrams: 3.2,
      dimensions: "Banda de 2 mm",
      certificate: "Certificado gemológico independiente",
    },
    description: [
      "Un diamante de medio quilate sostenido por seis garras finas que dejan pasar la luz por todos los ángulos.",
      "La banda delgada en oro blanco hace que la piedra se vea más grande y combina con cualquier argolla.",
    ],
    variants: [
      { label: "Talla 6", priceUnits: 14_800_000, stock: 1 },
      { label: "Talla 7", priceUnits: 14_800_000, stock: 1 },
      { label: "Talla 8", priceUnits: 14_800_000, stock: 0 },
    ],
    featured: true,
  },
  {
    slug: "maison-ardent-collar-constelacion",
    brand: "Maison Ardent",
    model: "Collar Constelación",
    reference: "MA-C207",
    category: "collares",
    subtitle: "Oro amarillo 18 k · Siete diamantes",
    specs: {
      metal: "Oro amarillo 18 k",
      stones: "Siete diamantes talla brillante",
      caratTotal: 0.35,
      weightGrams: 4.1,
      dimensions: "Largo de 42 cm, ajustable a 45 cm",
      certificate: "Certificado de la casa",
    },
    description: [
      "Siete diamantes repartidos a lo largo de una cadena fina, como puntos de luz que se mueven con el cuello.",
      "Ligero para el día a día y suficiente para una noche de gala sin más joyas.",
    ],
    variants: [{ label: "", priceUnits: 9_200_000, stock: 2 }],
  },
  {
    slug: "casa-arboleda-argollas-rio",
    brand: "Casa Arboleda",
    model: "Argollas Río",
    reference: "CA-A022",
    category: "aretes",
    subtitle: "Oro amarillo 18 k · 22 mm",
    specs: {
      metal: "Oro amarillo 18 k",
      stones: null,
      caratTotal: null,
      weightGrams: 3.6,
      dimensions: "Diámetro de 22 mm",
      certificate: "Certificado de la casa",
    },
    description: [
      "Argollas huecas de superficie ondulada que reflejan la luz como el agua en movimiento.",
      "Cierre de bisagra seguro y un peso que permite llevarlas todo el día.",
    ],
    variants: [{ label: "", priceUnits: 3_400_000, stock: 3 }],
  },
  {
    slug: "casa-arboleda-pulsera-trenza",
    brand: "Casa Arboleda",
    model: "Pulsera Trenza",
    reference: "CA-P104",
    category: "pulseras",
    subtitle: "Oro rosa 18 k · Tejido a mano",
    specs: {
      metal: "Oro rosa 18 k",
      stones: null,
      caratTotal: null,
      weightGrams: 8.4,
      dimensions: "Ancho de 4 mm",
      certificate: "Certificado de la casa",
    },
    description: [
      "Tres hilos de oro rosa trenzados a mano en el taller: flexible, cómoda y con un brillo cálido.",
      "Cierre de caja con doble seguro, escondido dentro del tejido.",
    ],
    variants: [
      { label: "16 cm", priceUnits: 7_900_000, stock: 1 },
      { label: "18 cm", priceUnits: 8_300_000, stock: 1 },
    ],
  },
  {
    slug: "orfebreria-santamaria-anillo-esmeralda-colonial",
    brand: "Orfebrería Santamaría",
    model: "Anillo Esmeralda Colonial",
    reference: "OS-E120",
    category: "anillos",
    subtitle: "Oro amarillo 18 k · Esmeralda colombiana",
    specs: {
      metal: "Oro amarillo 18 k",
      stones: "Esmeralda colombiana talla esmeralda y dos diamantes laterales",
      caratTotal: 1.2,
      weightGrams: 5,
      dimensions: "Piedra central de 7 × 5 mm",
      certificate: "Certificado gemológico independiente",
    },
    description: [
      "Una esmeralda colombiana de verde intenso, enmarcada por dos diamantes y un engaste inspirado en la joyería colonial.",
      "Cada piedra se escoge a mano y viaja con su certificado de origen y tratamiento.",
    ],
    variants: [
      { label: "Talla 6", priceUnits: 21_500_000, stock: 0 },
      { label: "Talla 7", priceUnits: 21_500_000, stock: 0 },
    ],
  },
  {
    slug: "orfebreria-santamaria-medalla-filigrana",
    brand: "Orfebrería Santamaría",
    model: "Medalla Filigrana",
    reference: "OS-F018",
    category: "collares",
    subtitle: "Oro amarillo 18 k · Filigrana",
    specs: {
      metal: "Oro amarillo 18 k",
      stones: null,
      caratTotal: null,
      weightGrams: 2.8,
      dimensions: "Medalla de 18 mm con cadena de 45 cm",
      certificate: "Certificado de la casa",
    },
    description: [
      "Hilos de oro más finos que un cabello, enrollados y soldados uno a uno según la técnica tradicional de la filigrana.",
      "Una pieza de herencia que se regala y se vuelve a regalar.",
    ],
    variants: [{ label: "", priceUnits: 2_600_000, stock: 4 }],
  },
  {
    slug: "atelier-lirio-aretes-gota-de-zafiro",
    brand: "Atelier Lirio",
    model: "Aretes Gota de Zafiro",
    reference: "AL-Z014",
    category: "aretes",
    subtitle: "Oro blanco 18 k · Zafiros azules",
    specs: {
      metal: "Oro blanco 18 k",
      stones: "Dos zafiros azules talla pera",
      caratTotal: 1.1,
      weightGrams: 2.4,
      dimensions: "Largo de 14 mm",
      certificate: "Certificado gemológico independiente",
    },
    description: [
      "Dos zafiros talla pera de azul profundo que cuelgan apenas por debajo del lóbulo.",
      "Discretos de día y muy luminosos con la luz de la noche.",
    ],
    variants: [{ label: "", priceUnits: 6_800_000, stock: 1 }],
  },
  {
    slug: "atelier-lirio-brazalete-luna",
    brand: "Atelier Lirio",
    model: "Brazalete Luna",
    reference: "AL-B080",
    category: "pulseras",
    subtitle: "Plata 925 · Rígido",
    specs: {
      metal: "Plata 925",
      stones: null,
      caratTotal: null,
      weightGrams: 18,
      dimensions: "Ancho de 8 mm",
      certificate: "Certificado de la casa",
    },
    description: [
      "Brazalete rígido de plata con acabado satinado por fuera y pulido espejo por dentro.",
      "Abierto en la parte posterior para ponérselo sin cierre; se ajusta levemente a la muñeca.",
    ],
    variants: [
      { label: "Talla S", priceUnits: 1_850_000, stock: 2 },
      { label: "Talla M", priceUnits: 1_850_000, stock: 3 },
    ],
  },
];

export const JEWELRY_BRANDS: DemoBrandInput[] = [
  { name: "Maison Ardent", description: "Alta joyería con diamantes certificados y diseños de líneas limpias." },
  { name: "Casa Arboleda", description: "Taller de orfebres que trabaja el oro a mano, pieza por pieza." },
  { name: "Orfebrería Santamaría", description: "Esmeraldas colombianas y filigrana tradicional en oro de 18 k." },
  { name: "Atelier Lirio", description: "Joyería contemporánea en oro blanco y plata para el día a día." },
];

/** Joya de demo. `id` y `niche` deciden la imagen (`/assets/demo/<nicho>/<id>.webp`). */
export function jewelryProduct(row: JewelryRow, o: { niche: string; line: string; id: string; featured: boolean }): Product {
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
    includes: JEWELRY_INCLUDES,
    specs: { kind: "joya", ...row.specs },
    variants: row.variants,
    media: { front: demoFront(o.niche, o.id, name), back: null },
    featured: o.featured,
  });
}

export const JEWELRY_LINE = {
  slug: "joyeria",
  label: "Joyería",
  description: "Oro, plata y piedras certificadas en diseños para todos los días y para las fechas que se recuerdan.",
  template: "joya",
  coverAlt: "Silueta de un anillo sobre fondo oscuro",
} as const;

const NICHE = "joyeria";
const products = JEWELRY_ROWS.map((row, i) =>
  jewelryProduct(row, { niche: NICHE, line: JEWELRY_LINE.slug, id: `demo-jy-${String(i + 1).padStart(2, "0")}`, featured: row.featured ?? false }),
);

export const JOYERIA: DemoPack = {
  lines: [demoLine(NICHE, { ...JEWELRY_LINE, order: 1 })],
  categories: [
    { slug: "anillos", label: "Anillos", order: 1, line: "joyeria" },
    { slug: "collares", label: "Collares", order: 2, line: "joyeria" },
    { slug: "pulseras", label: "Pulseras", order: 3, line: "joyeria" },
    { slug: "aretes", label: "Aretes", order: 4, line: "joyeria" },
  ],
  brands: demoBrands(JEWELRY_BRANDS, products),
  products,
};
