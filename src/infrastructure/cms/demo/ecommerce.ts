import type { Product } from "@/domain/entities/product";
import { demoBrands, demoLine, pick, type DemoBrandInput, type DemoPack } from "./build";
import { JEWELRY_BRANDS, JEWELRY_LINE, JEWELRY_ROWS, jewelryProduct } from "./joyeria";
import { PERFUME_BRANDS, PERFUME_LINE, PERFUME_ROWS, perfumeProduct } from "./perfumeria";
import { WATCH_BRANDS, WATCH_LINE, WATCH_ROWS, watchProduct } from "./relojeria";

/**
 * Tienda multilínea de demo: relojería, joyería y perfumería con dos casas
 * por línea y cuatro productos cada una. Reutiliza las fichas de los nichos
 * con ids e imágenes propias; el destacado y el agotado se fijan aquí.
 */
const NICHE = "ecommerce";

function brandsNamed(all: readonly DemoBrandInput[], ...names: string[]): DemoBrandInput[] {
  return names.map((name) => {
    const brand = all.find((b) => b.name === name);
    if (!brand) throw new Error(`Marca de demo inexistente: ${name}`);
    return brand;
  });
}

const id = (prefix: string, i: number) => `demo-ec-${prefix}-${String(i + 1).padStart(2, "0")}`;

const watches: Product[] = [
  pick(WATCH_ROWS, "valdes-hijos-cordillera-automatico"),
  pick(WATCH_ROWS, "valdes-hijos-bahia-200"),
  pick(WATCH_ROWS, "hartwig-sohn-kaliber-eins"),
  // Vendido: el agotado del pack.
  pick(WATCH_ROWS, "hartwig-sohn-regatta-chronograph"),
].map((row, i) => watchProduct(row, { niche: NICHE, line: WATCH_LINE.slug, id: id("rj", i), featured: false }));

const jewelry: Product[] = [
  pick(JEWELRY_ROWS, "maison-ardent-solitario-aurora"),
  pick(JEWELRY_ROWS, "maison-ardent-collar-constelacion"),
  // En el nicho de joyería está agotado; aquí queda una talla para que el agotado sea solo el reloj.
  {
    ...pick(JEWELRY_ROWS, "orfebreria-santamaria-anillo-esmeralda-colonial"),
    variants: [
      { label: "Talla 6", priceUnits: 21_500_000, stock: 1 },
      { label: "Talla 7", priceUnits: 21_500_000, stock: 0 },
    ],
  },
  pick(JEWELRY_ROWS, "orfebreria-santamaria-medalla-filigrana"),
].map((row, i) => jewelryProduct(row, { niche: NICHE, line: JEWELRY_LINE.slug, id: id("jy", i), featured: i === 0 }));

const perfumes: Product[] = [
  pick(PERFUME_ROWS, "ateliers-brume-niebla-de-cedro"),
  pick(PERFUME_ROWS, "ateliers-brume-lluvia-blanca"),
  pick(PERFUME_ROWS, "parfums-vireo-vetiver-andino"),
  pick(PERFUME_ROWS, "parfums-vireo-jardin-de-peonias"),
].map((row, i) => perfumeProduct(row, { niche: NICHE, line: PERFUME_LINE.slug, id: id("pf", i), featured: false }));

/** Orden = "más reciente primero", intercalado por línea para que la colección se vea mixta. */
const products: Product[] = watches.flatMap((w, i) => [w, jewelry[i]!, perfumes[i]!]);

export const ECOMMERCE: DemoPack = {
  lines: [
    demoLine(NICHE, { ...WATCH_LINE, order: 1 }),
    demoLine(NICHE, { ...JEWELRY_LINE, order: 2 }),
    demoLine(NICHE, { ...PERFUME_LINE, order: 3 }),
  ],
  categories: [
    { slug: "automatico", label: "Automáticos", order: 1, line: "relojeria" },
    { slug: "cronografo", label: "Cronógrafos", order: 2, line: "relojeria" },
    { slug: "buceo", label: "Buceo", order: 3, line: "relojeria" },
    { slug: "anillos", label: "Anillos", order: 10, line: "joyeria" },
    { slug: "collares", label: "Collares", order: 11, line: "joyeria" },
    { slug: "amaderados", label: "Amaderados", order: 20, line: "perfumeria" },
    { slug: "florales", label: "Florales", order: 21, line: "perfumeria" },
    { slug: "frescos", label: "Frescos y cítricos", order: 22, line: "perfumeria" },
  ],
  brands: demoBrands(
    [
      ...brandsNamed(WATCH_BRANDS, "Valdés & Hijos", "Hartwig & Sohn"),
      ...brandsNamed(JEWELRY_BRANDS, "Maison Ardent", "Orfebrería Santamaría"),
      ...brandsNamed(PERFUME_BRANDS, "Ateliers Brume", "Parfums Vireo"),
    ],
    products,
  ),
  products,
};
