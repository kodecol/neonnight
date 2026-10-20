import type { ProductImage, ProductKind } from "./product";

/**
 * Plantilla de una línea: decide la ficha técnica, los filtros y el detalle.
 * `general` sirve para cualquier línea nueva (ficha de filas libres).
 */
export const LINE_TEMPLATES = ["reloj", "joya", "perfume", "general"] as const satisfies readonly ProductKind[];
export type LineTemplate = (typeof LINE_TEMPLATES)[number];

/**
 * Cómo se vende lo de cada plantilla:
 * - `pieza`: unidades únicas o casi; al agotarse se lee "Vendido".
 * - `unidades`: stock repetible; se elige cantidad y al agotarse se lee "Agotado".
 */
export type SaleMode = "pieza" | "unidades";
export const SALE_MODE: Record<LineTemplate, SaleMode> = { reloj: "pieza", joya: "pieza", perfume: "unidades", general: "unidades" };

/**
 * Línea de producto (Relojería, Joyería, Perfumería…), administrable desde el
 * panel. Slug y plantilla se fijan al crearla: los usan los productos, las
 * categorías y la URL `/coleccion/<slug>`.
 */
export interface ProductLine {
  readonly slug: string;
  readonly label: string;
  /** Una frase para la portada de la línea. */
  readonly description: string;
  readonly order: number;
  readonly template: LineTemplate;
  readonly cover: ProductImage | null;
}
