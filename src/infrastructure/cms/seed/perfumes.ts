import type { PerfumeGender, Product } from "@/domain/entities/product";
import { buildProduct, cutout, editorialMedia, type SeedEditorial, type Seeded } from "./build";

/**
 * Perfumería (v2). Frascos sellados con lote verificable; el precio cambia
 * por presentación. Fotos de catálogo de las casas recortadas SOLO para el
 * mockup (ver README "Nota legal").
 */
interface PerfumeRow {
  slug: string;
  brand: string;
  model: string;
  category: string;
  concentration: string;
  gender: PerfumeGender;
  perfumer: string | null;
  year: number | null;
  notes: { top: string[]; heart: string[]; base: string[] };
  subtitle: string;
  description: string[];
  variants: Array<{ label: string; priceUnits: number; stock: number }>;
  editorial?: SeedEditorial;
}

const rows: PerfumeRow[] = [
  {
    slug: "creed-aventus",
    brand: "Creed",
    model: "Aventus",
    category: "frescos-y-aromaticos",
    concentration: "Eau de Parfum",
    gender: "masculino",
    perfumer: "Olivier Creed y Erwin Creed",
    year: 2010,
    notes: { top: ["Bergamota de Calabria", "Limón siciliano", "Hoja de grosella negra"], heart: ["Piña", "Pimienta rosa", "Jazmín"], base: ["Abedul", "Pachulí", "Almizcle"] },
    subtitle: "Eau de Parfum · Masculino",
    description: [
      "La fragancia que convirtió a la casa Creed en referencia de una generación: bergamota y piña jugosa sobre un fondo de abedul ahumado y almizcle.",
      "Sale fresca y luminosa, y con las horas se asienta en una estela seca y elegante. Funciona igual en la oficina que en una cena.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 1_520_000, stock: 4 },
      { label: "100 ml", priceUnits: 2_040_000, stock: 3 },
    ],
    editorial: { w: 2400, h: 1350, as: "band" },
  },
  {
    slug: "mfk-baccarat-rouge-540",
    brand: "Maison Francis Kurkdjian",
    model: "Baccarat Rouge 540",
    category: "ambar-y-especias",
    concentration: "Eau de Parfum",
    gender: "unisex",
    perfumer: "Francis Kurkdjian",
    year: 2015,
    notes: { top: ["Azafrán", "Jazmín"], heart: ["Madera de ámbar", "Ámbar gris"], base: ["Resina de abeto", "Cedro"] },
    subtitle: "Eau de Parfum · Unisex",
    description: [
      "Nació para celebrar los 250 años de la cristalería Baccarat y terminó siendo la firma más reconocible de Francis Kurkdjian.",
      "Azafrán y jazmín sobre un fondo mineral de ámbar y cedro: una estela luminosa, casi de azúcar quemado, que se reconoce a metros.",
    ],
    variants: [
      { label: "70 ml", priceUnits: 1_440_000, stock: 5 },
      { label: "200 ml", priceUnits: 2_860_000, stock: 2 },
    ],
    editorial: { w: 2400, h: 1500, as: "band" },
  },
  {
    slug: "le-labo-santal-33",
    brand: "Le Labo",
    model: "Santal 33",
    category: "amaderados",
    concentration: "Eau de Parfum",
    gender: "unisex",
    perfumer: "Frank Voelkl",
    year: 2011,
    notes: { top: ["Cardamomo", "Violeta"], heart: ["Iris", "Papiro", "Ambrox"], base: ["Sándalo australiano", "Cedro", "Cuero"] },
    subtitle: "Eau de Parfum · Unisex",
    description: [
      "Sándalo australiano, cuero y cardamomo: un amaderado seco y cremoso que se volvió el uniforme olfativo de Nueva York.",
      "Cada frasco lleva la etiqueta de laboratorio de la casa, con la fecha y el lugar de su mezcla.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 1_000_000, stock: 4 },
      { label: "100 ml", priceUnits: 1_390_000, stock: 3 },
    ],
    editorial: { w: 2400, h: 1350, as: "hero" },
  },
  {
    slug: "tom-ford-oud-wood",
    brand: "Tom Ford",
    model: "Oud Wood",
    category: "amaderados",
    concentration: "Eau de Parfum",
    gender: "unisex",
    perfumer: "Richard Herpin",
    year: 2007,
    notes: { top: ["Palo de rosa", "Cardamomo", "Pimienta de Sichuan"], heart: ["Oud", "Sándalo", "Vetiver"], base: ["Haba tonka", "Vainilla", "Ámbar"] },
    subtitle: "Private Blend · Eau de Parfum",
    description: [
      "El oud que abrió la colección Private Blend: ahumado, especiado y suave a la vez, sin la aspereza del oud tradicional.",
      "Palo de rosa y cardamomo en la salida, un corazón de sándalo y vetiver y un fondo cálido de haba tonka.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 1_200_000, stock: 3 },
      { label: "100 ml", priceUnits: 1_840_000, stock: 2 },
    ],
  },
  {
    slug: "parfums-de-marly-layton",
    brand: "Parfums de Marly",
    model: "Layton",
    category: "ambar-y-especias",
    concentration: "Eau de Parfum",
    gender: "masculino",
    perfumer: "Hamid Merati-Kashani",
    year: 2016,
    notes: { top: ["Manzana", "Bergamota", "Cardamomo"], heart: ["Lavanda", "Violeta", "Geranio"], base: ["Pachulí", "Vainilla", "Madera de guayaco", "Praliné"] },
    subtitle: "Eau de Parfum · Masculino",
    description: [
      "Manzana y lavanda sobre un fondo de vainilla y especias: el oriental fresco que Parfums de Marly dedicó a las caballerizas de Versalles.",
      "Proyecta con fuerza las primeras horas y deja una estela cálida que dura hasta la noche.",
    ],
    variants: [
      { label: "75 ml", priceUnits: 1_160_000, stock: 4 },
      { label: "125 ml", priceUnits: 1_600_000, stock: 3 },
    ],
  },
  {
    slug: "kilian-angels-share",
    brand: "Kilian Paris",
    model: "Angels' Share",
    category: "ambar-y-especias",
    concentration: "Eau de Parfum",
    gender: "unisex",
    perfumer: "Benoist Lapouza",
    year: 2020,
    notes: { top: ["Coñac"], heart: ["Canela", "Haba tonka", "Roble"], base: ["Praliné", "Vainilla", "Sándalo"] },
    subtitle: "Eau de Parfum · Unisex",
    description: [
      "Debe su nombre a la parte del coñac que se evapora en la barrica mientras envejece: la porción de los ángeles.",
      "Coñac, canela y praliné en un frasco de vidrio grabado que pesa como una pieza de bar. Gourmand, cálido y sin dulzor empalagoso.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 1_140_000, stock: 3 },
      { label: "100 ml", priceUnits: 1_660_000, stock: 1 },
    ],
    editorial: { w: 2400, h: 1600, as: "band" },
  },
  {
    slug: "dior-sauvage-elixir",
    brand: "Dior",
    model: "Sauvage Elixir",
    category: "frescos-y-aromaticos",
    concentration: "Elixir",
    gender: "masculino",
    perfumer: "François Demachy",
    year: 2021,
    notes: { top: ["Pomelo"], heart: ["Canela", "Nuez moscada", "Cardamomo", "Lavanda"], base: ["Regaliz", "Sándalo", "Ámbar", "Pachulí", "Vetiver de Haití"] },
    subtitle: "Elixir · Masculino",
    description: [
      "La versión más concentrada de Sauvage: lavanda y especias frescas sobre un fondo denso de regaliz, sándalo y ámbar.",
      "Una sola aplicación acompaña todo el día. El frasco de vidrio ahumado anticipa lo que hay dentro.",
    ],
    variants: [
      { label: "60 ml", priceUnits: 800_000, stock: 6 },
      { label: "100 ml", priceUnits: 1_060_000, stock: 5 },
    ],
  },
  {
    slug: "byredo-gypsy-water",
    brand: "Byredo",
    model: "Gypsy Water",
    category: "amaderados",
    concentration: "Eau de Parfum",
    gender: "unisex",
    perfumer: "Jérôme Epinette",
    year: 2008,
    notes: { top: ["Bergamota", "Limón", "Pimienta", "Bayas de enebro"], heart: ["Incienso", "Agujas de pino", "Raíz de lirio"], base: ["Ámbar", "Vainilla", "Sándalo"] },
    subtitle: "Eau de Parfum · Unisex",
    description: [
      "Un retrato del bosque al aire libre: cítricos y enebro en la salida, agujas de pino e incienso en el corazón.",
      "Termina en una vainilla suave y amaderada, limpia y fácil de llevar en cualquier clima.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 940_000, stock: 4 },
      { label: "100 ml", priceUnits: 1_320_000, stock: 2 },
    ],
  },
  {
    slug: "chanel-coco-mademoiselle",
    brand: "Chanel",
    model: "Coco Mademoiselle",
    category: "florales",
    concentration: "Eau de Parfum",
    gender: "femenino",
    perfumer: "Jacques Polge",
    year: 2001,
    notes: { top: ["Naranja", "Bergamota"], heart: ["Rosa", "Jazmín"], base: ["Pachulí", "Vetiver", "Vainilla", "Almizcle blanco"] },
    subtitle: "Eau de Parfum · Femenino",
    description: [
      "El chipre floral moderno de Chanel: naranja fresca, rosa y jazmín, y un fondo de pachulí que le da carácter.",
      "Elegante sin ser solemne. Un clásico que se lleva de día y de noche.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 620_000, stock: 6 },
      { label: "100 ml", priceUnits: 740_000, stock: 5 },
    ],
  },
  {
    slug: "chanel-no5-eau-de-parfum",
    brand: "Chanel",
    model: "N°5",
    category: "florales",
    concentration: "Eau de Parfum",
    gender: "femenino",
    perfumer: "Jacques Polge, sobre el original de Ernest Beaux",
    year: 1986,
    notes: { top: ["Aldehídos", "Neroli", "Ylang-ylang", "Bergamota"], heart: ["Rosa de mayo", "Jazmín", "Iris", "Lirio de los valles"], base: ["Sándalo", "Vainilla Bourbon", "Vetiver"] },
    subtitle: "Eau de Parfum · Femenino",
    description: [
      "El perfume más famoso del mundo, creado por Ernest Beaux en 1921: un bouquet abstracto de flores envuelto en aldehídos.",
      "La versión Eau de Parfum, de 1986, es redonda y envolvente, con un fondo de sándalo y vainilla. El frasco apenas ha cambiado en un siglo.",
    ],
    variants: [
      { label: "50 ml", priceUnits: 630_000, stock: 2 },
      { label: "100 ml", priceUnits: 760_000, stock: 3 },
    ],
  },
];

function build(row: PerfumeRow, i: number): Product {
  const name = `${row.brand} ${row.model}`;
  const front = cutout(`/assets/products/${row.slug}-front.webp`, `${name}, frasco`);
  const back = cutout(`/assets/products/${row.slug}-back.webp`, `${name}, segunda vista`);
  return buildProduct({
    id: `pf-${String(i + 1).padStart(2, "0")}`,
    slug: row.slug,
    line: "perfumeria",
    category: row.category,
    brand: row.brand,
    model: row.model,
    reference: "",
    condition: "nuevo",
    subtitle: row.subtitle,
    description: row.description,
    includes: ["Caja original sellada"],
    specs: { kind: "perfume", concentration: row.concentration, gender: row.gender, perfumer: row.perfumer, year: row.year, notes: row.notes },
    variants: row.variants,
    media: { front, back, ...editorialMedia(row.slug, name, row.editorial) },
  });
}

export const SEED_PERFUMES: ReadonlyArray<Seeded<Product>> = rows.map((r, i) => ({ since: 2, item: build(r, i) }));
