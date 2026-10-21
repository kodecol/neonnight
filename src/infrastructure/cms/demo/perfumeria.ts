import type { PerfumeSpecs, Product } from "@/domain/entities/product";
import { buildProduct } from "../seed/build";
import { demoBrands, demoFront, demoLine, type DemoBrandInput, type DemoPack } from "./build";

/**
 * Perfumería de demo: cuatro casas y perfumistas ficticios, ocho fragancias
 * con dos o tres presentaciones; el precio y el stock cambian por mililitros.
 */
export interface PerfumeRow {
  slug: string;
  brand: string;
  model: string;
  category: string;
  subtitle: string;
  specs: Omit<PerfumeSpecs, "kind">;
  description: string[];
  variants: Array<{ label: string; priceUnits: number; stock: number }>;
  featured?: boolean;
}

export const PERFUME_INCLUDES = ["Caja original sellada"];

export const PERFUME_ROWS: PerfumeRow[] = [
  {
    slug: "ateliers-brume-niebla-de-cedro",
    brand: "Ateliers Brume",
    model: "Niebla de Cedro",
    category: "amaderados",
    subtitle: "Eau de Parfum · Unisex",
    specs: {
      concentration: "Eau de Parfum",
      gender: "unisex",
      perfumer: "Lucía Ferrán",
      year: 2022,
      notes: { top: ["Bergamota", "Pimienta rosa"], heart: ["Cedro del Atlas", "Iris"], base: ["Vetiver", "Almizcle blanco"] },
    },
    description: [
      "Cedro seco y un iris empolvado, como la madera de una casa de montaña en una mañana fría.",
      "Una estela cercana y elegante que dura todo el día sin imponerse.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 690_000, stock: 5 },
      { label: "100 ml", priceUnits: 980_000, stock: 3 },
    ],
    featured: true,
  },
  {
    slug: "ateliers-brume-lluvia-blanca",
    brand: "Ateliers Brume",
    model: "Lluvia Blanca",
    category: "frescos",
    subtitle: "Eau de Toilette · Unisex",
    specs: {
      concentration: "Eau de Toilette",
      gender: "unisex",
      perfumer: "Lucía Ferrán",
      year: 2023,
      notes: { top: ["Limón verde", "Notas acuosas"], heart: ["Té blanco", "Lirio de los valles"], base: ["Almizcle", "Madera de cachemira"] },
    },
    description: [
      "El olor de la ropa limpia secándose al sol después de un aguacero.",
      "Fresca y transparente, ideal para el clima cálido y para quien prefiere un perfume que apenas se insinúa.",
    ],
    variants: [
      { label: "30 ml", priceUnits: 380_000, stock: 6 },
      { label: "100 ml", priceUnits: 720_000, stock: 4 },
    ],
  },
  {
    slug: "ambre-sel-brisa-de-sal",
    brand: "Ambre & Sel",
    model: "Brisa de Sal",
    category: "frescos",
    subtitle: "Eau de Parfum · Masculino",
    specs: {
      concentration: "Eau de Parfum",
      gender: "masculino",
      perfumer: "Étienne Vauclair",
      year: 2021,
      notes: { top: ["Limón", "Notas marinas"], heart: ["Salvia", "Romero"], base: ["Ámbar gris", "Madera flotante"] },
    },
    description: [
      "Hierbas de costa y piel con sal: una fragancia marina que se aleja de lo dulce.",
      "Sale vibrante y se asienta en un fondo mineral y cálido que dura hasta la noche.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 540_000, stock: 4 },
      { label: "100 ml", priceUnits: 820_000, stock: 2 },
    ],
  },
  {
    slug: "ambre-sel-ambar-nocturno",
    brand: "Ambre & Sel",
    model: "Ámbar Nocturno",
    category: "amaderados",
    subtitle: "Extrait de Parfum · Unisex",
    specs: {
      concentration: "Extrait de Parfum",
      gender: "unisex",
      perfumer: "Étienne Vauclair",
      year: 2020,
      notes: { top: ["Azafrán", "Cardamomo"], heart: ["Labdano", "Rosa"], base: ["Ámbar", "Benjuí", "Vainilla"] },
    },
    description: [
      "Ámbar resinoso, especias tibias y un toque de rosa: un perfume de noche, envolvente y profundo.",
      "Concentración de extracto: dos aplicaciones bastan para toda la velada.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 1_150_000, stock: 2 },
      { label: "100 ml", priceUnits: 1_690_000, stock: 1 },
    ],
  },
  {
    slug: "casa-mirador-flor-de-cafe",
    brand: "Casa Mirador",
    model: "Flor de Café",
    category: "florales",
    subtitle: "Eau de Parfum · Femenino",
    specs: {
      concentration: "Eau de Parfum",
      gender: "femenino",
      perfumer: "Mariana Oquendo",
      year: 2024,
      notes: { top: ["Flor de café", "Mandarina"], heart: ["Azahar", "Jazmín sambac"], base: ["Haba tonka", "Sándalo"] },
    },
    description: [
      "La flor blanca del cafeto, que solo abre unos días al año, convertida en un floral luminoso y algo goloso.",
      "Azahar y jazmín en el corazón, y un fondo cremoso de sándalo que se queda en la piel.",
    ],
    variants: [
      { label: "30 ml", priceUnits: 420_000, stock: 3 },
      { label: "50 ml", priceUnits: 610_000, stock: 5 },
      { label: "100 ml", priceUnits: 890_000, stock: 2 },
    ],
  },
  {
    slug: "casa-mirador-orquidea-de-niebla",
    brand: "Casa Mirador",
    model: "Orquídea de Niebla",
    category: "florales",
    subtitle: "Eau de Parfum · Femenino",
    specs: {
      concentration: "Eau de Parfum",
      gender: "femenino",
      perfumer: "Mariana Oquendo",
      year: 2022,
      notes: { top: ["Pera", "Bergamota"], heart: ["Orquídea", "Peonía"], base: ["Musgo", "Pachulí"] },
    },
    description: [
      "Un floral verde y húmedo, inspirado en las orquídeas que crecen entre la neblina del bosque andino.",
      "Fresco al principio y cada vez más suave, con un fondo terroso de musgo.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 640_000, stock: 0 },
      { label: "100 ml", priceUnits: 930_000, stock: 0 },
    ],
  },
  {
    slug: "parfums-vireo-vetiver-andino",
    brand: "Parfums Vireo",
    model: "Vetiver Andino",
    category: "amaderados",
    subtitle: "Eau de Parfum · Masculino",
    specs: {
      concentration: "Eau de Parfum",
      gender: "masculino",
      perfumer: "Tomás Ribera",
      year: 2023,
      notes: { top: ["Pomelo", "Jengibre"], heart: ["Vetiver", "Hoja de violeta"], base: ["Cedro", "Musgo de roble"] },
    },
    description: [
      "Vetiver ahumado con un arranque chispeante de pomelo y jengibre.",
      "Un amaderado limpio y versátil, de los que funcionan igual en la oficina que el fin de semana.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 560_000, stock: 4 },
      { label: "100 ml", priceUnits: 790_000, stock: 3 },
    ],
  },
  {
    slug: "parfums-vireo-jardin-de-peonias",
    brand: "Parfums Vireo",
    model: "Jardín de Peonías",
    category: "florales",
    subtitle: "Eau de Toilette · Femenino",
    specs: {
      concentration: "Eau de Toilette",
      gender: "femenino",
      perfumer: "Tomás Ribera",
      year: 2021,
      notes: { top: ["Grosella roja", "Mandarina"], heart: ["Peonía", "Rosa"], base: ["Almizcle blanco", "Cedro"] },
    },
    description: [
      "Peonías recién cortadas con un toque frutal de grosella: alegre, fresca y muy fácil de llevar.",
      "La presentación de viaje cabe en cualquier bolso.",
    ],
    variants: [
      { label: "30 ml", priceUnits: 350_000, stock: 8 },
      { label: "50 ml", priceUnits: 480_000, stock: 6 },
      { label: "100 ml", priceUnits: 690_000, stock: 0 },
    ],
  },
];

export const PERFUME_BRANDS: DemoBrandInput[] = [
  { name: "Ateliers Brume", description: "Perfumería de autor con maderas y notas limpias, en series pequeñas." },
  { name: "Ambre & Sel", description: "Fragancias marinas y ambaradas de carácter, pensadas para durar." },
  { name: "Casa Mirador", description: "Florales inspirados en los paisajes y las flores de los Andes." },
  { name: "Parfums Vireo", description: "Clásicos modernos: amaderados y florales fáciles de llevar." },
];

/** Perfume de demo. `id` y `niche` deciden la imagen (`/assets/demo/<nicho>/<id>.webp`). */
export function perfumeProduct(row: PerfumeRow, o: { niche: string; line: string; id: string; featured: boolean }): Product {
  const name = `${row.brand} ${row.model}`;
  return buildProduct({
    id: o.id,
    slug: row.slug,
    line: o.line,
    category: row.category,
    brand: row.brand,
    model: row.model,
    reference: "",
    condition: "nuevo",
    subtitle: row.subtitle,
    description: row.description,
    includes: PERFUME_INCLUDES,
    specs: { kind: "perfume", ...row.specs },
    variants: row.variants,
    media: { front: demoFront(o.niche, o.id, name), back: null },
    featured: o.featured,
  });
}

export const PERFUME_LINE = {
  slug: "perfumeria",
  label: "Perfumería",
  description: "Fragancias de autor en frascos sellados, en la presentación que mejor se ajuste a tu rutina.",
  template: "perfume",
  coverAlt: "Silueta de un frasco de perfume sobre fondo oscuro",
} as const;

const NICHE = "perfumeria";
const products = PERFUME_ROWS.map((row, i) =>
  perfumeProduct(row, { niche: NICHE, line: PERFUME_LINE.slug, id: `demo-pf-${String(i + 1).padStart(2, "0")}`, featured: row.featured ?? false }),
);

export const PERFUMERIA: DemoPack = {
  lines: [demoLine(NICHE, { ...PERFUME_LINE, order: 1 })],
  categories: [
    { slug: "amaderados", label: "Amaderados", order: 1, line: "perfumeria" },
    { slug: "florales", label: "Florales", order: 2, line: "perfumeria" },
    { slug: "frescos", label: "Frescos y cítricos", order: 3, line: "perfumeria" },
  ],
  brands: demoBrands(PERFUME_BRANDS, products),
  products,
};
