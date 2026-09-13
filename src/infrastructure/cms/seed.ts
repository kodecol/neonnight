import { watchId, type Watch, type WatchCategory } from "@/domain/entities/watch";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";

/**
 * Los 8 productos del prototipo (docs/handoff/Neon Night.dc.html, baseProducts()).
 * PENDIENTE (handoff §7): referencias 02–08 son placeholders; precios inventados;
 * solo la 01 tiene imágenes definitivas. Sustituir por el adaptador del CMS.
 */
const UPDATED_AT = new Date("2026-09-01T00:00:00.000Z");

interface SeedRow {
  n: string;
  brand: string;
  model: string;
  reference: string;
  subtitle: string;
  category: WatchCategory;
  caseMm: number;
  priceUnits: number;
  movement: string;
  powerReserve: number | null;
  waterResistance: number | null;
  material: string;
}

const rows: SeedRow[] = [
  { n: "01", brand: "Rolex", model: "Day-Date 36", reference: "128238", subtitle: "Automático · 36 mm", category: "automatico", caseMm: 36, priceUnits: 12_900_000, movement: "Automático · Cal. 3255", powerReserve: 70, waterResistance: 100, material: "oro amarillo" },
  { n: "02", brand: "Modelo", model: "02", reference: "REF-02", subtitle: "Cronógrafo · 40 mm", category: "cronografo", caseMm: 40, priceUnits: 9_400_000, movement: "Automático", powerReserve: null, waterResistance: null, material: "acero" },
  { n: "03", brand: "Modelo", model: "03", reference: "REF-03", subtitle: "Automático · 39 mm", category: "automatico", caseMm: 39, priceUnits: 18_600_000, movement: "Automático", powerReserve: null, waterResistance: null, material: "acero" },
  { n: "04", brand: "Modelo", model: "04", reference: "REF-04", subtitle: "GMT · 42 mm", category: "gmt", caseMm: 42, priceUnits: 15_200_000, movement: "Automático GMT", powerReserve: null, waterResistance: null, material: "acero" },
  { n: "05", brand: "Modelo", model: "05", reference: "REF-05", subtitle: "Automático · 36 mm", category: "automatico", caseMm: 36, priceUnits: 7_800_000, movement: "Automático", powerReserve: null, waterResistance: null, material: "acero" },
  { n: "06", brand: "Modelo", model: "06", reference: "REF-06", subtitle: "Cronógrafo · 43 mm", category: "cronografo", caseMm: 43, priceUnits: 22_500_000, movement: "Automático", powerReserve: null, waterResistance: null, material: "acero" },
  { n: "07", brand: "Modelo", model: "07", reference: "REF-07", subtitle: "Automático · 40 mm", category: "automatico", caseMm: 40, priceUnits: 11_300_000, movement: "Automático", powerReserve: null, waterResistance: null, material: "acero" },
  { n: "08", brand: "Modelo", model: "08", reference: "REF-08", subtitle: "Buceo · 42 mm", category: "buceo", caseMm: 42, priceUnits: 16_900_000, movement: "Automático", powerReserve: null, waterResistance: 300, material: "acero" },
];

const PLACEHOLDER_DESCRIPTION = [
  "Placeholder de descripción. Aquí va el texto de la pieza: origen, estado, historia del movimiento y qué incluye la entrega.",
  "Dos o tres párrafos cortos funcionan mejor que uno largo.",
];

function build(row: SeedRow): Watch {
  const isRef01 = row.n === "01";
  const name = `${row.brand} ${row.model}`;
  const slug = isRef01 ? "rolex-day-date-36" : `modelo-${row.n}`;
  return {
    id: watchId(`w-${row.n}`),
    slug: Slug.of(slug),
    brand: row.brand,
    model: row.model,
    reference: Reference.of(row.reference),
    price: Money.fromUnits(row.priceUnits),
    category: row.category,
    condition: "excelente",
    subtitle: row.subtitle,
    description: isRef01
      ? [
          "Una referencia conocida, sin el sobreprecio de la vitrina. Caja de 36 mm en oro amarillo con bisel estriado y brazalete President.",
          "Verificada en mano: calibre, número de serie y caja revisados antes del despacho. Informe fotográfico incluido.",
        ]
      : PLACEHOLDER_DESCRIPTION,
    specs: {
      movement: row.movement,
      powerReserveHours: row.powerReserve,
      caseMm: row.caseMm,
      caseMaterial: row.material,
      crystal: "Zafiro",
      waterResistanceM: row.waterResistance,
    },
    media: isRef01
      ? {
          front: { src: "/assets/ref01-front.png", alt: `${name} vista frontal`, width: 1233, height: 1275 },
          back: { src: "/assets/ref01-back.png", alt: `${name} vista trasera`, width: 1233, height: 1275 },
          hero: { src: "/assets/hero-day-date.mp4", poster: "/assets/hero-day-date-poster.jpg" },
          gallery: [
            { src: "/assets/ref01-front.png", alt: `${name} dial y agujas`, width: 1233, height: 1275 },
            { src: "/assets/ref01-back.png", alt: `${name} caja y corona`, width: 1233, height: 1275 },
          ],
          band: { src: "/assets/hero-day-date-poster.jpg", alt: `${name} detalle`, width: 1920, height: 1080 },
          video: { src: "/assets/vertical-daytona.mp4", poster: "/assets/vertical-daytona-poster.jpg" },
        }
      : { front: null, back: null, hero: null, gallery: [], band: null, video: null },
    includes: ["Caja y papeles"],
    availability: "disponible",
    featured: isRef01,
    updatedAt: UPDATED_AT,
  };
}

export const SEED_WATCHES: readonly Watch[] = rows.map(build);
