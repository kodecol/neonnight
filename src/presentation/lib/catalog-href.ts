import type { CatalogQueryState, SortKey } from "@/application/dto/catalog.dto";

/**
 * Enlaces de la colección: los filtros viven en la URL (`?marca=rolex,cartier&orden=precio-asc`)
 * para que funcionen sin JS, se compartan y el servidor los resuelva.
 */
export function catalogHref(base: string, query: CatalogQueryState, sort: SortKey = "novedades"): string {
  const sp = new URLSearchParams();
  for (const [key, values] of Object.entries(query)) if (values.length) sp.set(key, values.join(","));
  if (sort !== "novedades") sp.set("orden", sort);
  const s = sp.toString().replace(/%2C/g, ",");
  return s ? `${base}?${s}` : base;
}

/** Activa o desactiva un valor. En facetas de una sola opción, reemplaza. */
export function toggleValue(query: CatalogQueryState, key: string, value: string, multi: boolean): CatalogQueryState {
  const current = query[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : multi ? [...current, value] : [value];
  const out = { ...query, [key]: next };
  if (next.length === 0) delete out[key];
  return out;
}

export function withoutValue(query: CatalogQueryState, key: string, value: string): CatalogQueryState {
  const next = (query[key] ?? []).filter((v) => v !== value);
  const out = { ...query, [key]: next };
  if (next.length === 0) delete out[key];
  return out;
}
