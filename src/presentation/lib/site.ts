export function siteUrl(): URL {
  // SITE_URL se lee en runtime (la misma imagen sirve para cualquier dominio);
  // NEXT_PUBLIC_SITE_URL queda como respaldo para desarrollo local.
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(raw);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

export const ROUTES = {
  home: "/",
  collection: "/coleccion",
  watch: (slug: string) => `/reloj/${slug}`,
  thanks: "/gracias",
} as const;
