import type { LineTemplate } from "@/domain/entities/product-line";
import type { ImageDto, ProductSummaryDto } from "./product.dto";

export interface LineDto {
  slug: string;
  label: string;
  description: string;
  template: LineTemplate;
  cover: ImageDto | null;
  /** Productos publicados en la línea. */
  count: number;
}

export const SORT_OPTIONS = [
  { value: "novedades", label: "Novedades" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export interface FacetOptionDto {
  value: string;
  label: string;
  /** Resultados si se aplica (con el resto de filtros activos). */
  count: number;
  selected: boolean;
}

export interface FacetDto {
  key: string;
  label: string;
  multi: boolean;
  options: FacetOptionDto[];
}

/**
 * Filtro de precio: el rango real de lo que se ve (con el resto de filtros
 * aplicados, sin el de precio), tramos sugeridos y lo elegido.
 */
export interface PriceFilterDto {
  /** Precio "desde" más bajo y más alto de la vista, en pesos. */
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  /** Paso cómodo para los campos numéricos. */
  step: number;
  selected: { min: number | null; max: number | null } | null;
  /** Tramos sugeridos (cuantiles redondeados); vacío si no aportan. `value` va en `?precio=`. */
  options: FacetOptionDto[];
}

export interface CategoryChipDto {
  slug: string;
  label: string;
  count: number;
  selected: boolean;
}

/** Filtros válidos y normalizados: la presentación construye los enlaces a partir de aquí. */
export type CatalogQueryState = Record<string, string[]>;

export interface CatalogResultDto {
  line: LineDto | null;
  lines: LineDto[];
  categories: CategoryChipDto[];
  facets: FacetDto[];
  /** null si no hay con qué filtrar por precio (0 o 1 precio distinto y nada elegido). */
  price: PriceFilterDto | null;
  sort: SortKey;
  products: ProductSummaryDto[];
  /** Productos de la vista sin filtros (toda la colección o la línea). */
  total: number;
  /** Filtros activos, listos para pintarse como etiquetas que se quitan. */
  active: Array<{ key: string; value: string; label: string }>;
  query: CatalogQueryState;
  filtered: boolean;
}
