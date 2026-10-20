import type { Product, WatchSpecs } from "@/domain/entities/product";
import { buildProduct, cutout, editorialMedia, type SeedEditorial, type Seeded } from "./build";

/** Relojería añadida en la v2 del seed (mismas reglas de fotos que `watches.ts`). */
interface WatchRow {
  slug: string;
  brand: string;
  model: string;
  reference: string;
  category: string;
  subtitle: string;
  specs: Omit<WatchSpecs, "kind">;
  priceUnits: number;
  description: string[];
  includes: string[];
  editorial?: SeedEditorial;
}

const rows: WatchRow[] = [
  {
    slug: "rolex-submariner-date-126610ln",
    brand: "Rolex",
    model: "Submariner Date",
    reference: "126610LN",
    category: "buceo",
    subtitle: "Buceo · 41 mm",
    specs: { movement: "Automático · Cal. 3235", powerReserveHours: 70, caseMm: 41, caseMaterial: "Oystersteel", crystal: "Zafiro", waterResistanceM: 300 },
    priceUnits: 58_000_000,
    description: [
      "El reloj de buceo que fijó el canon desde 1953, en su generación de 41 mm: bisel Cerachrom negro, dial lacado y brazalete Oyster.",
      "Calibre 3235 con 70 horas de reserva, hermético a 300 metros y con el cierre Glidelock para ajustarlo sin herramientas.",
    ],
    includes: ["Caja y papeles", "Tarjeta de garantía"],
    editorial: { w: 2100, h: 1397, as: "hero" },
  },
  {
    slug: "grand-seiko-snowflake-sbga211",
    brand: "Grand Seiko",
    model: "Snowflake",
    reference: "SBGA211",
    category: "automatico",
    subtitle: "Spring Drive · 41 mm",
    specs: { movement: "Spring Drive · Cal. 9R65", powerReserveHours: 72, caseMm: 41, caseMaterial: "Titanio de alta intensidad", crystal: "Zafiro de doble curva", waterResistanceM: 100 },
    priceUnits: 19_500_000,
    description: [
      "El dial texturizado evoca la nieve de los Alpes de Shinshu, donde se ensambla. La aguja de segundos se desliza sin un solo salto.",
      "Caja de titanio pulida a mano con la técnica Zaratsu: más liviana que el acero y con un brillo de espejo sin distorsión.",
    ],
    includes: ["Caja y papeles"],
    editorial: { w: 1690, h: 1100, as: "hero" },
  },
  {
    slug: "audemars-piguet-royal-oak-15510st",
    editorial: { w: 1146, h: 750, as: "band" },
    brand: "Audemars Piguet",
    model: "Royal Oak 41",
    reference: "15510ST.OO.1320ST.06",
    category: "automatico",
    subtitle: "Automático · 41 mm",
    specs: { movement: "Automático · Cal. 4302", powerReserveHours: 70, caseMm: 41, caseMaterial: "acero", crystal: "Zafiro", waterResistanceM: 50 },
    priceUnits: 200_000_000,
    description: [
      "El diseño de Gérald Genta de 1972 que inventó el reloj deportivo de lujo: bisel octogonal con ocho tornillos y brazalete integrado.",
      "Dial Grande Tapisserie en azul Bleu Nuit, el tono del Royal Oak original, y calibre 4302 de manufactura visible a través del fondo de zafiro.",
    ],
    includes: ["Caja y papeles"],
  },
  {
    slug: "cartier-tank-must-large",
    brand: "Cartier",
    model: "Tank Must",
    reference: "WSTA0041",
    category: "vestir",
    subtitle: "Vestir · 33,7 × 25,5 mm",
    specs: { movement: "Cuarzo de alta autonomía", powerReserveHours: null, caseMm: 33.7, caseMaterial: "acero", crystal: "Zafiro", waterResistanceM: 30 },
    priceUnits: 11_500_000,
    description: [
      "La silueta rectangular que Louis Cartier dibujó en 1917 inspirada en los tanques de la Primera Guerra Mundial.",
      "Esfera plateada con números romanos, agujas de acero azulado y corona con cabujón azul. Apenas 6,6 mm de grosor sobre una correa de piel negra.",
    ],
    includes: ["Caja y papeles"],
    editorial: { w: 1920, h: 1250, as: "hero" },
  },
];

function build(row: WatchRow, i: number): Product {
  const name = `${row.brand} ${row.model}`;
  const front = cutout(`/assets/products/${row.slug}-front.webp`, `${name} vista frontal`);
  const back = cutout(`/assets/products/${row.slug}-back.webp`, `${name} segunda vista`);
  return buildProduct({
    id: `w-${String(i + 9).padStart(2, "0")}`,
    slug: row.slug,
    line: "relojeria",
    category: row.category,
    brand: row.brand,
    model: row.model,
    reference: row.reference,
    condition: "nuevo",
    subtitle: row.subtitle,
    description: row.description,
    includes: row.includes,
    specs: { kind: "reloj", ...row.specs },
    variants: [{ label: "", priceUnits: row.priceUnits, stock: 1 }],
    media: { front, back, ...editorialMedia(row.slug, name, row.editorial) },
  });
}

export const NEW_WATCHES: ReadonlyArray<Seeded<Product>> = rows.map((r, i) => ({ since: 2, item: build(r, i) }));
