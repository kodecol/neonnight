import type { JewelrySpecs, Product } from "@/domain/entities/product";
import { buildProduct, cutout, editorialMedia, type SeedEditorial, type Seeded } from "./build";

/**
 * Joyería (v2). Piezas verificadas con estuche y certificado; las tallas son
 * variantes con su propio stock. Fotos de catálogo de las casas recortadas
 * SOLO para el mockup (ver README "Nota legal").
 */
interface JewelryRow {
  slug: string;
  brand: string;
  model: string;
  reference: string;
  category: "anillos" | "collares" | "pulseras" | "aretes";
  subtitle: string;
  specs: Omit<JewelrySpecs, "kind">;
  description: string[];
  variants: Array<{ label: string; priceUnits: number; stock: number }>;
  condition?: Product["condition"];
  editorial?: SeedEditorial;
}

const rows: JewelryRow[] = [
  {
    slug: "cartier-love-brazalete-oro-amarillo",
    brand: "Cartier",
    model: "Brazalete LOVE",
    reference: "B6067517",
    category: "pulseras",
    subtitle: "Oro amarillo 18 k · Modelo clásico",
    specs: { metal: "Oro amarillo 18 k", stones: null, caratTotal: null, weightGrams: null, dimensions: "Ancho 6,1 mm", certificate: "Certificado Cartier" },
    description: [
      "Diseñado por Aldo Cipullo en Nueva York en 1969: un aro ovalado que se cierra con un pequeño destornillador y no se quita por accidente.",
      "Los tornillos de la superficie son parte del diseño, no un adorno. Una de las piezas más reconocibles de la joyería del siglo XX.",
    ],
    variants: [
      { label: "Talla 16", priceUnits: 31_800_000, stock: 1 },
      { label: "Talla 17", priceUnits: 31_800_000, stock: 1 },
      { label: "Talla 18", priceUnits: 31_800_000, stock: 1 },
    ],
    editorial: { w: 1920, h: 1080, as: "band" },
  },
  {
    slug: "cartier-juste-un-clou-brazalete-oro-rosa",
    brand: "Cartier",
    model: "Brazalete Juste un Clou",
    reference: "B6048117",
    category: "pulseras",
    subtitle: "Oro rosa 18 k · Modelo clásico",
    specs: { metal: "Oro rosa 18 k", stones: null, caratTotal: null, weightGrams: null, dimensions: "Ancho 3,5 mm", certificate: "Certificado Cartier" },
    description: [
      "Un clavo de oro doblado sobre la muñeca: la idea con la que Aldo Cipullo convirtió un objeto cotidiano en joya en los años setenta.",
      "Se lleva solo o junto al LOVE, y en oro rosa gana una calidez que combina con cualquier reloj.",
    ],
    variants: [
      { label: "Talla 16", priceUnits: 34_800_000, stock: 1 },
      { label: "Talla 17", priceUnits: 34_800_000, stock: 1 },
    ],
  },
  {
    slug: "cartier-trinity-anillo-clasico",
    brand: "Cartier",
    model: "Anillo Trinity",
    reference: "B4234200",
    category: "anillos",
    subtitle: "Oro blanco, amarillo y rosa 18 k",
    specs: { metal: "Oro blanco, amarillo y rosa 18 k", stones: null, caratTotal: null, weightGrams: null, dimensions: "Modelo clásico", certificate: "Certificado Cartier" },
    description: [
      "Tres aros entrelazados en tres oros, creados en 1924 por Louis Cartier: blanco para la amistad, amarillo para la fidelidad, rosa para el amor.",
      "Los aros se mueven libremente sobre el dedo. Un anillo que se lleva todos los días.",
    ],
    variants: [
      { label: "Talla 52", priceUnits: 9_400_000, stock: 1 },
      { label: "Talla 54", priceUnits: 9_400_000, stock: 2 },
      { label: "Talla 56", priceUnits: 9_400_000, stock: 1 },
    ],
    editorial: { w: 1920, h: 1080, as: "band" },
  },
  {
    slug: "van-cleef-vintage-alhambra-collar-onix",
    brand: "Van Cleef & Arpels",
    model: "Collar Vintage Alhambra",
    reference: "VCARA42700",
    category: "collares",
    subtitle: "10 motivos · Ónix y oro amarillo 18 k",
    specs: { metal: "Oro amarillo 18 k", stones: "Ónix", caratTotal: null, weightGrams: null, dimensions: "10 motivos", certificate: "Certificado Van Cleef & Arpels" },
    description: [
      "El trébol de cuatro hojas que Van Cleef & Arpels convirtió en símbolo de buena suerte en 1968, con su borde de perlas de oro.",
      "Diez motivos de ónix negro sobre una cadena de oro amarillo. Se lleva corto o, doblado, como gargantilla.",
    ],
    variants: [{ label: "", priceUnits: 38_800_000, stock: 1 }],
    editorial: { w: 2400, h: 1350, as: "band" },
  },
  {
    slug: "van-cleef-vintage-alhambra-aretes-nacar",
    brand: "Van Cleef & Arpels",
    model: "Aretes Vintage Alhambra",
    reference: "VCARA44100",
    category: "aretes",
    subtitle: "Nácar blanco y oro amarillo 18 k",
    specs: { metal: "Oro amarillo 18 k", stones: "Nácar blanco", caratTotal: null, weightGrams: null, dimensions: null, certificate: "Certificado Van Cleef & Arpels" },
    description: [
      "El trébol de cuatro hojas que Van Cleef & Arpels convirtió en amuleto en 1968, en nácar blanco y con su borde de perlas de oro.",
      "Del tamaño justo para llevarlos todos los días. Cierre de clip con poste, cómodo incluso sin perforación profunda.",
    ],
    variants: [{ label: "", priceUnits: 19_000_000, stock: 1 }],
    editorial: { w: 1575, h: 2100, as: "hero" },
  },
  {
    slug: "bulgari-serpenti-viper-anillo-oro-rosa",
    brand: "Bulgari",
    model: "Anillo Serpenti Viper",
    reference: "362150",
    category: "anillos",
    subtitle: "Oro rosa 18 k · Una vuelta",
    specs: { metal: "Oro rosa 18 k", stones: null, caratTotal: null, weightGrams: null, dimensions: "Una vuelta", certificate: "Certificado Bulgari" },
    description: [
      "La serpiente, emblema de Bulgari desde los años cuarenta, reinterpretada en escamas geométricas que se adaptan al dedo.",
      "En oro rosa pulido, con la estructura flexible que define a la línea Viper.",
    ],
    variants: [
      { label: "Talla 51-52", priceUnits: 11_600_000, stock: 1 },
      { label: "Talla 53-54", priceUnits: 11_600_000, stock: 1 },
    ],
    editorial: { w: 1800, h: 1013, as: "hero" },
  },
  {
    slug: "tiffany-setting-solitario-platino",
    brand: "Tiffany & Co.",
    model: "Solitario Tiffany Setting",
    reference: "GRP10862",
    category: "anillos",
    subtitle: "Diamante talla brillante · Platino",
    specs: { metal: "Platino", stones: "Diamante talla brillante redonda", caratTotal: null, weightGrams: null, dimensions: "Montura de seis garras", certificate: "Certificado Tiffany & Co. y GIA" },
    description: [
      "El solitario que Tiffany presentó en 1886: seis garras de platino que elevan el diamante para que la luz lo atraviese por todos lados.",
      "Cada piedra viaja con su certificado. Lo dimensionamos a tu talla sin costo.",
    ],
    variants: [
      { label: "0,50 ct", priceUnits: 24_000_000, stock: 1 },
      { label: "1,00 ct", priceUnits: 72_000_000, stock: 1 },
    ],
    condition: "nuevo",
    editorial: { w: 2400, h: 1350, as: "band" },
  },
  {
    slug: "tiffany-hardwear-collar-oro",
    brand: "Tiffany & Co.",
    model: "Collar HardWear",
    reference: "70751127",
    category: "collares",
    subtitle: "Eslabones medianos · Oro amarillo 18 k",
    specs: { metal: "Oro amarillo 18 k", stones: null, caratTotal: null, weightGrams: null, dimensions: "Largo 45,7 cm", certificate: "Certificado Tiffany & Co." },
    description: [
      "Inspirado en una pieza de archivo de 1962 y en la energía industrial de Nueva York: eslabones de oro unidos por esferas, con un ritmo casi arquitectónico.",
      "Pesa lo justo para sentirse y cierra con un mosquetón integrado en el diseño.",
    ],
    variants: [{ label: "", priceUnits: 78_000_000, stock: 1 }],
    editorial: { w: 2400, h: 1350, as: "hero" },
  },
];

function build(row: JewelryRow, i: number): Product {
  const name = `${row.brand} ${row.model}`;
  const front = cutout(`/assets/products/${row.slug}-front.webp`, `${name}, vista principal`);
  const back = cutout(`/assets/products/${row.slug}-back.webp`, `${name}, segunda vista`);
  return buildProduct({
    id: `jy-${String(i + 1).padStart(2, "0")}`,
    slug: row.slug,
    line: "joyeria",
    category: row.category,
    brand: row.brand,
    model: row.model,
    reference: row.reference,
    condition: row.condition ?? "nuevo",
    subtitle: row.subtitle,
    description: row.description,
    includes: ["Estuche original", "Certificado de autenticidad"],
    specs: { kind: "joya", ...row.specs },
    variants: row.variants,
    media: { front, back, ...editorialMedia(row.slug, name, row.editorial) },
  });
}

export const SEED_JEWELRY: ReadonlyArray<Seeded<Product>> = rows.map((r, i) => ({ since: 2, item: build(r, i) }));
