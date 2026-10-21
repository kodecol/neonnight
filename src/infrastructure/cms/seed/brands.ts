import { brandKey, type Brand } from "@/domain/entities/brand";
import type { Product } from "@/domain/entities/product";
import { Slug } from "@/domain/value-objects/slug";
import LOGOS from "./brand-logos.json";

/**
 * Logos oficiales que trae el sitio (clave = `brandKey` del nombre). Los
 * comparte `scripts/migrate-brands.mjs`. Ver la nota legal del README.
 */
export const BRAND_LOGOS: Record<string, { src: string; ratio: number; color: string }> = LOGOS;

/**
 * Marcas a partir de los productos: una por nombre normalizado, con el nombre
 * tal como aparece primero, las líneas donde vende y el logo si lo hay. El
 * orden inicial es el del marquee de siempre: la más representada primero.
 */
export function brandsFromProducts(products: readonly Product[]): Brand[] {
  const groups = new Map<string, { name: string; lines: Set<string>; count: number }>();
  for (const p of products) {
    const name = p.brand.trim();
    if (!name) continue;
    const key = brandKey(name);
    const g = groups.get(key) ?? { name, lines: new Set<string>(), count: 0 };
    g.lines.add(p.line);
    g.count++;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort(([, a], [, b]) => b.count - a.count || a.name.localeCompare(b.name, "es"))
    .map(([key, g], i) => {
      const logo = BRAND_LOGOS[key];
      return {
        slug: Slug.fromText(g.name).value,
        name: g.name,
        lines: [...g.lines].sort(),
        logo: logo ? { src: logo.src, ratio: logo.ratio, mode: "silhouette" as const } : null,
        color: logo?.color ?? null,
        visible: true,
        order: i + 1,
        description: null,
      };
    });
}
