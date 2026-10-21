import type { ProductKind } from "@/domain/entities/product";

export function siteUrl(): URL {
  // SITE_URL se lee en runtime (la misma imagen sirve para cualquier dominio);
  // NEXT_PUBLIC_SITE_URL queda como respaldo para desarrollo local.
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(raw);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
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
