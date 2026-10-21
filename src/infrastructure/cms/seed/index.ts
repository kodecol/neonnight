import type { Brand } from "@/domain/entities/brand";
import type { Category } from "@/domain/entities/category";
import type { Product } from "@/domain/entities/product";
import type { ProductLine } from "@/domain/entities/product-line";
import type { Seeded } from "./build";
import { NEW_WATCHES } from "./new-watches";
import { SEED_JEWELRY } from "./jewelry";
import { SEED_PERFUMES } from "./perfumes";
import { SEED_WATCHES } from "./watches";
import { brandsFromProducts } from "./brands";

export { SEED_VERSION, type Seeded } from "./build";

/** Líneas iniciales. En Mongo se insertan una vez; luego se administran en /admin. */
export const SEEDED_LINES: ReadonlyArray<Seeded<ProductLine>> = [
  {
    since: 2,
    item: {
      slug: "relojeria",
      label: "Relojería",
      description: "Referencias de las grandes manufacturas, revisadas pieza por pieza antes de llegar a tu muñeca.",
      order: 1,
      template: "reloj",
      cover: { src: "/assets/lines/relojeria.webp", alt: "Tudor Black Bay 58 sobre fondo negro", width: 1120, height: 1400 },
    },
  },
  {
    since: 2,
    item: {
      slug: "joyeria",
      label: "Joyería",
      description: "Los diseños que no pasan de moda, en oro y piedras, con su estuche y su certificado.",
      order: 2,
      template: "joya",
      cover: { src: "/assets/lines/joyeria.webp", alt: "Mujer de perfil con aretes y pulsera Alhambra de Van Cleef & Arpels", width: 1575, height: 1969 },
    },
  },
  {
    since: 2,
    item: {
      slug: "perfumeria",
      label: "Perfumería",
      description: "Fragancias de autor y de las grandes casas, selladas y con lote verificable.",
      order: 3,
      template: "perfume",
      cover: { src: "/assets/lines/perfumeria.webp", alt: "Frasco de Creed Aventus junto a una roca y una bergamota, con luz cálida", width: 1350, height: 1688 },
    },
  },
];

export const SEEDED_CATEGORIES: ReadonlyArray<Seeded<Category>> = [
  { since: 1, item: { slug: "automatico", label: "Automáticos", order: 1, line: "relojeria" } },
  { since: 1, item: { slug: "cronografo", label: "Cronógrafos", order: 2, line: "relojeria" } },
  { since: 1, item: { slug: "gmt", label: "GMT", order: 3, line: "relojeria" } },
  { since: 1, item: { slug: "buceo", label: "Buceo", order: 4, line: "relojeria" } },
  { since: 2, item: { slug: "vestir", label: "Vestir", order: 5, line: "relojeria" } },
  { since: 2, item: { slug: "anillos", label: "Anillos", order: 10, line: "joyeria" } },
  { since: 2, item: { slug: "collares", label: "Collares", order: 11, line: "joyeria" } },
  { since: 2, item: { slug: "pulseras", label: "Pulseras", order: 12, line: "joyeria" } },
  { since: 2, item: { slug: "aretes", label: "Aretes", order: 13, line: "joyeria" } },
  { since: 2, item: { slug: "amaderados", label: "Amaderados", order: 20, line: "perfumeria" } },
  { since: 2, item: { slug: "ambar-y-especias", label: "Ámbar y especias", order: 21, line: "perfumeria" } },
  { since: 2, item: { slug: "florales", label: "Florales", order: 22, line: "perfumeria" } },
  { since: 2, item: { slug: "frescos-y-aromaticos", label: "Frescos y aromáticos", order: 23, line: "perfumeria" } },
];

/**
 * Orden = "más reciente primero". Las referencias de la v1 conservan su orden
 * y lo nuevo se intercala por línea para que la colección se vea mixta.
 */
export const SEEDED_PRODUCTS: ReadonlyArray<Seeded<Product>> = [...interleave([SEED_PERFUMES, SEED_JEWELRY, NEW_WATCHES]), ...SEED_WATCHES];

function interleave<T>(groups: ReadonlyArray<readonly T[]>): T[] {
  const out: T[] = [];
  const max = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < max; i++) for (const g of groups) if (g[i]) out.push(g[i]!);
  return out;
}

export const SEED_LINES: readonly ProductLine[] = SEEDED_LINES.map((s) => s.item);
export const SEED_CATEGORIES: readonly Category[] = SEEDED_CATEGORIES.map((s) => s.item);
export const SEED_PRODUCTS: readonly Product[] = SEEDED_PRODUCTS.map((s) => s.item);

/** Marcas (v3): salen de los productos del seed, con los logos que trae el sitio. */
export const SEEDED_BRANDS: ReadonlyArray<Seeded<Brand>> = brandsFromProducts(SEED_PRODUCTS).map((item) => ({ since: 3, item }));
export const SEED_BRANDS: readonly Brand[] = SEEDED_BRANDS.map((s) => s.item);
