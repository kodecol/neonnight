import type { ProductKind } from "@/domain/entities/product";

/**
 * URL absoluta de una ruta de la tienda. `base` es la URL pública de la tienda
 * de esta petición (`config.siteUrl`: SITE_URL en modo single, el host del
 * tenant en el demo host): nunca se lee del entorno aquí.
 */
export function absoluteUrl(path: string, base: string): string {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}

/** Segmento de URL del detalle según la plantilla: /reloj, /joya, /perfume o /producto. */
export const PRODUCT_SEGMENT: Record<ProductKind, string> = { reloj: "reloj", joya: "joya", perfume: "perfume", general: "producto" };

export const ROUTES = {
  home: "/",
  collection: "/coleccion",
  line: (slug: string) => `/coleccion/${slug}`,
  product: (kind: ProductKind, slug: string) => `/${PRODUCT_SEGMENT[kind]}/${slug}`,
  thanks: "/gracias",
  checkout: "/checkout",
} as const;
