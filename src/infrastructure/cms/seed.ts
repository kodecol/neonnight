import { watchId, type Watch, type WatchCategory, type WatchImage } from "@/domain/entities/watch";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";

/**
 * Catálogo de mockup: 8 referencias reales con foto frontal y trasera.
 *
 * Las 8 referencias usan fotografías de catálogo de terceros recortadas a
 * PNG transparente SOLO para el mockup
 * (ver README "Nota legal"): en producción deben sustituirse por fotografía
 * propia de las piezas en inventario. Precios orientativos en COP; el CMS
 * será la fuente autoritativa.
 */
const UPDATED_AT = new Date("2026-09-13T00:00:00.000Z");

interface SeedRow {
  n: string;
  slug: string;
  brand: string;
  model: string;
  reference: string;
  subtitle: string;
  category: WatchCategory;
  priceUnits: number;
  movement: string;
  powerReserve: number | null;
  caseMm: number;
  material: string;
  waterResistance: number | null;
  description: string[];
  includes: string[];
  imgSize: { w: number; h: number };
}

const rows: SeedRow[] = [
  {
    n: "01",
    slug: "rolex-sky-dweller-326938",
    brand: "Rolex",
    model: "Sky-Dweller",
    reference: "326938",
    subtitle: "GMT · Calendario anual · 42 mm",
    category: "gmt",
    priceUnits: 168_000_000,
    movement: "Automático · Cal. 9001",
    powerReserve: 72,
    caseMm: 42,
    material: "oro amarillo",
    waterResistance: 100,
    description: [
      "El Rolex más complicado del catálogo, en oro amarillo de 18 quilates con dial champán y numerales arábigos. Segunda zona horaria en disco descentrado y calendario anual Saros.",
      "Bisel Ring Command para ajustar las funciones desde la corona. Calibre 9001 con 72 horas de reserva de marcha. Pieza completa con caja, tarjeta y eslabones.",
    ],
    includes: ["Caja y papeles", "Tarjeta de garantía"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "02",
    slug: "rolex-cosmograph-daytona-126500ln",
    brand: "Rolex",
    model: "Cosmograph Daytona",
    reference: "126500LN",
    subtitle: "Cronógrafo · 40 mm",
    category: "cronografo",
    priceUnits: 132_000_000,
    movement: "Automático · Cal. 4131",
    powerReserve: 72,
    caseMm: 40,
    material: "Oystersteel",
    waterResistance: 100,
    description: [
      "El Daytona de acero con dial blanco y contadores negros, el «panda» que define al cronógrafo moderno. Bisel Cerachrom negro con escala taquimétrica.",
      "Generación 2023 con calibre 4131: escape Chronergy, 72 horas de reserva y certificación Superlative Chronometer. Pieza completa con caja, tarjeta y eslabones.",
    ],
    includes: ["Caja y papeles", "Tarjeta de garantía"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "03",
    slug: "tudor-black-bay-fifty-eight-79030n",
    brand: "Tudor",
    model: "Black Bay Fifty-Eight",
    reference: "79030N",
    subtitle: "Automático · 39 mm",
    category: "automatico",
    priceUnits: 16_900_000,
    movement: "Automático · Cal. MT5402",
    powerReserve: 70,
    caseMm: 39,
    material: "acero",
    waterResistance: 200,
    description: [
      "Buceo de 39 mm con proporciones vintage: bisel de aluminio negro con marcas doradas, dial abombado y brazalete de acero remachado.",
      "Calibre de manufactura MT5402 certificado COSC. Corona a rosca, 200 metros de hermeticidad y solo 11,9 mm de grosor.",
    ],
    includes: ["Caja y papeles"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "04",
    slug: "rolex-gmt-master-ii-126710blnr",
    brand: "Rolex",
    model: "GMT-Master II",
    reference: "126710BLNR",
    subtitle: "GMT · 40 mm",
    category: "gmt",
    priceUnits: 79_500_000,
    movement: "Automático GMT · Cal. 3285",
    powerReserve: 70,
    caseMm: 40,
    material: "Oystersteel",
    waterResistance: 100,
    description: [
      "El «Batman»: bisel Cerachrom bicolor azul y negro, dial negro con Chromalight y brazalete Jubilee de cinco eslabones.",
      "Segunda zona horaria con aguja 24 h independiente. Calibre 3285 con escape Chronergy y 70 horas de reserva de marcha.",
    ],
    includes: ["Caja y papeles", "Tarjeta de garantía"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "05",
    slug: "rolex-datejust-36-126234",
    brand: "Rolex",
    model: "Datejust 36",
    reference: "126234",
    subtitle: "Automático · 36 mm",
    category: "automatico",
    priceUnits: 46_500_000,
    movement: "Automático · Cal. 3235",
    powerReserve: 70,
    caseMm: 36,
    material: "Rolesor blanco",
    waterResistance: 100,
    description: [
      "El Datejust clásico en Rolesor blanco: caja de acero, bisel estriado de oro blanco y dial azul con índices aplicados.",
      "Brazalete Jubilee con cierre Oysterclasp y extensión Easylink. Calibre 3235 con 70 horas de reserva.",
    ],
    includes: ["Caja y papeles"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "06",
    slug: "omega-speedmaster-moonwatch-sapphire",
    brand: "Omega",
    model: "Speedmaster Moonwatch",
    reference: "310.30.42.50.01.002",
    subtitle: "Cronógrafo · 42 mm",
    category: "cronografo",
    priceUnits: 34_900_000,
    movement: "Manual · Cal. 3861 Co-Axial Master Chronometer",
    powerReserve: 50,
    caseMm: 42,
    material: "acero",
    waterResistance: 50,
    description: [
      "El Moonwatch «sapphire sandwich»: cristal de zafiro al frente y fondo transparente que deja ver el calibre 3861.",
      "Caja asimétrica de 42 mm, bisel de aluminio negro con escala taquimétrica y brazalete de acero con cierre ajustable. Certificado Master Chronometer por METAS.",
    ],
    includes: ["Caja y papeles", "Tarjeta de garantía"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "07",
    slug: "cartier-santos-de-cartier-large-wssa0018",
    brand: "Cartier",
    model: "Santos de Cartier",
    reference: "WSSA0018",
    subtitle: "Automático · 39,8 mm",
    category: "automatico",
    priceUnits: 32_500_000,
    movement: "Automático · Cal. 1847 MC",
    powerReserve: 42,
    caseMm: 40,
    material: "acero",
    waterResistance: 100,
    description: [
      "El modelo grande del Santos: caja cuadrada de acero con tornillos a la vista, dial opalino plateado con números romanos y agujas espada azuladas.",
      "Sistema QuickSwitch para cambiar el brazalete sin herramientas y SmartLink para ajustar la talla. Calibre 1847 MC de manufactura.",
    ],
    includes: ["Caja y papeles", "Correa de piel adicional"],
    imgSize: { w: 1200, h: 1200 },
  },
  {
    n: "08",
    slug: "omega-seamaster-diver-300m",
    brand: "Omega",
    model: "Seamaster Diver 300M",
    reference: "210.30.42.20.01.001",
    subtitle: "Buceo · 42 mm",
    category: "buceo",
    priceUnits: 22_900_000,
    movement: "Automático · Cal. 8800 Co-Axial Master Chronometer",
    powerReserve: 55,
    caseMm: 42,
    material: "acero",
    waterResistance: 300,
    description: [
      "El Seamaster de 2018: dial negro de cerámica con ondas grabadas a láser, bisel de cerámica negra y válvula de escape de helio.",
      "Calibre 8800 antimagnético hasta 15.000 gauss, fondo de zafiro y 300 metros de hermeticidad. Brazalete de acero con cierre de buzo.",
    ],
    includes: ["Caja y papeles"],
    imgSize: { w: 1200, h: 1200 },
  },
];

function img(row: SeedRow, view: "front" | "back", alt: string): WatchImage {
  return { src: `/assets/ref${row.n}-${view}.png`, alt, width: row.imgSize.w, height: row.imgSize.h };
}

function build(row: SeedRow): Watch {
  const isRef01 = row.n === "01";
  const name = `${row.brand} ${row.model}`;
  const front = img(row, "front", `${name} vista frontal`);
  const back = img(row, "back", `${name} vista trasera`);
  return {
    id: watchId(`w-${row.n}`),
    slug: Slug.of(row.slug),
    brand: row.brand,
    model: row.model,
    reference: Reference.of(row.reference),
    price: Money.fromUnits(row.priceUnits),
    category: row.category,
    condition: "excelente",
    subtitle: row.subtitle,
    description: row.description,
    specs: {
      movement: row.movement,
      powerReserveHours: row.powerReserve,
      caseMm: row.caseMm,
      caseMaterial: row.material,
      crystal: "Zafiro",
      waterResistanceM: row.waterResistance,
    },
    media: {
      front,
      back,
      hero: isRef01 ? { src: "/assets/hero-day-date.mp4", poster: "/assets/hero-day-date-poster.jpg" } : null,
      gallery: [
        { ...front, alt: `${name} dial y agujas` },
        { ...back, alt: `${name} caja y corona` },
      ],
      band: isRef01 ? { src: "/assets/hero-day-date-poster.jpg", alt: `${name} detalle`, width: 1920, height: 1080 } : { ...front, alt: `${name} detalle` },
      video: isRef01 ? { src: "/assets/vertical-daytona.mp4", poster: "/assets/vertical-daytona-poster.jpg" } : null,
    },
    includes: row.includes,
    availability: "disponible",
    featured: isRef01,
    updatedAt: UPDATED_AT,
  };
}

export const SEED_WATCHES: readonly Watch[] = rows.map(build);
