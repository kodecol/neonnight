export function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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
