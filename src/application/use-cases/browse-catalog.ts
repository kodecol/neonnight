import type { Product } from "@/domain/entities/product";
import type { ProductLine } from "@/domain/entities/product-line";
import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { LineRepository } from "@/domain/repositories/line-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import { LineNotFoundError } from "@/domain/errors";
import { isPurchasable } from "@/domain/services/availability";
import { startingPrice } from "@/domain/services/pricing";
import { facetsFor, type FacetDef } from "../lib/facets";
import { toProductSummaryDto, type ImageDto } from "../dto/product.dto";
import { SORT_OPTIONS, type CatalogQueryState, type CatalogResultDto, type FacetDto, type LineDto, type SortKey } from "../dto/catalog.dto";

export type RawParams = Record<string, string | string[] | undefined>;

export interface BrowseCatalogQuery {
  /** Slug de la línea de la ruta; null = toda la colección. */
  line: string | null;
  params: RawParams;
}

const list = (v: string | string[] | undefined): string[] => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean));

export function toLineDto(l: ProductLine, count: number): LineDto {
  const cover: ImageDto | null = l.cover ? { ...l.cover } : null;
  return { slug: l.slug, label: l.label, description: l.description, template: l.template, cover, count };
}

/**
 * Colección con filtros por facetas (conteos disyuntivos: cada faceta cuenta
 * con el resto de filtros aplicados), categorías de la línea y orden. Todo se
 * resuelve en memoria sobre una sola consulta: el catálogo es de cientos de
 * piezas, no de miles.
 */
export class BrowseCatalog {
  constructor(private readonly deps: { products: ProductRepository; lines: LineRepository; categories: CategoryRepository }) {}

  async execute(q: BrowseCatalogQuery): Promise<CatalogResultDto> {
    const [all, lines, categories] = await Promise.all([this.deps.products.findAll(), this.deps.lines.list(), this.deps.categories.list()]);
    const line = q.line === null ? null : (lines.find((l) => l.slug === q.line) ?? null);
    if (q.line !== null && !line) throw new LineNotFoundError(q.line);

    const counts = new Map<string, number>();
    for (const p of all) counts.set(p.line, (counts.get(p.line) ?? 0) + 1);
    const lineDtos = lines.map((l) => toLineDto(l, counts.get(l.slug) ?? 0));

    const scope = line ? all.filter((p) => p.line === line.slug) : all;
    const lineCategories = line ? categories.filter((c) => c.line === line.slug) : [];
    const defs = facetsFor(line?.template ?? null);

    // Normaliza la query: solo claves conocidas y valores que existen.
    const query: CatalogQueryState = {};
    const categoryParam = list(q.params.categoria)[0];
    if (categoryParam && lineCategories.some((c) => c.slug === categoryParam)) query.categoria = [categoryParam];
    for (const def of defs) {
      const known = new Set(scope.flatMap((p) => def.values(p).map((v) => v.value)));
      const picked = list(q.params[def.key]).filter((v) => known.has(v));
      if (picked.length) query[def.key] = def.multi ? [...new Set(picked)] : [picked[0]!];
    }
    const sortParam = list(q.params.orden)[0];
    const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sortParam) ? (sortParam as SortKey) : "novedades";

    const matchCategory = (p: Product) => !query.categoria || p.category === query.categoria[0];
    const matchFacet = (def: FacetDef, p: Product) => {
      const want = query[def.key];
      return !want || def.values(p).some((v) => want.includes(v.value));
    };
    const matchAll = (p: Product, except?: string) =>
      (except === "categoria" || matchCategory(p)) && defs.every((d) => d.key === except || matchFacet(d, p));

    const facets: FacetDto[] = defs.flatMap((def) => {
      const base = scope.filter((p) => matchAll(p, def.key));
      const options = new Map<string, { label: string; count: number }>();
      for (const p of scope) for (const v of def.values(p)) if (!options.has(v.value)) options.set(v.value, { label: v.label, count: 0 });
      for (const p of base) for (const v of def.values(p)) options.get(v.value)!.count++;
      const selected = query[def.key] ?? [];
      const rows = [...options.entries()]
        .map(([value, o]) => ({ value, label: o.label, count: o.count, selected: selected.includes(value) }))
        .filter((o) => o.count > 0 || o.selected)
        .sort((a, b) => (def.order ? def.order.indexOf(a.value) - def.order.indexOf(b.value) : a.label.localeCompare(b.label, "es")));
      // Una faceta con una sola opción no ayuda a filtrar (salvo el interruptor de disponibilidad).
      if (rows.length === 0 || (rows.length === 1 && !def.toggle && !rows[0]!.selected)) return [];
      return [{ key: def.key, label: def.label, multi: def.multi, options: rows }];
    });

    const categoryBase = scope.filter((p) => matchAll(p, "categoria"));
    const categoryChips = lineCategories
      .map((c) => ({ slug: c.slug, label: c.label, count: categoryBase.filter((p) => p.category === c.slug).length, selected: query.categoria?.[0] === c.slug }))
      .filter((c) => c.count > 0 || c.selected);

    const results = scope.filter((p) => matchAll(p));
    const sorted = sortProducts(results, sort);

    const labelOf = (key: string, value: string) =>
      key === "categoria" ? (lineCategories.find((c) => c.slug === value)?.label ?? value) : (facets.find((f) => f.key === key)?.options.find((o) => o.value === value)?.label ?? value);
    const active = Object.entries(query).flatMap(([key, values]) => values.map((value) => ({ key, value, label: labelOf(key, value) })));

    return {
      line: line ? toLineDto(line, scope.length) : null,
      lines: lineDtos,
      categories: categoryChips,
      facets,
      sort,
      products: sorted.map(toProductSummaryDto),
      total: scope.length,
      active,
      query,
      filtered: active.length > 0 || sort !== "novedades",
    };
  }
}

/** Lo que se puede comprar va primero; dentro de cada grupo, el orden elegido (estable). */
function sortProducts(items: readonly Product[], sort: SortKey): Product[] {
  const rank = (p: Product) => (p.variants.some((v) => isPurchasable(p, v)) ? 0 : 1);
  const price = (p: Product) => startingPrice(p).cents;
  return items
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const r = rank(a.p) - rank(b.p);
      if (r !== 0) return r;
      if (sort === "precio-asc") return price(a.p) - price(b.p) || a.i - b.i;
      if (sort === "precio-desc") return price(b.p) - price(a.p) || a.i - b.i;
      return a.i - b.i;
    })
    .map((x) => x.p);
}
