export const SITE_NAME = "Neon Night";
export const SITE_TAGLINE = "El reloj que buscas, al precio que debió tener siempre.";
export const SITE_DESCRIPTION =
  "Relojes de lujo verificados en Colombia. Verificación en mano, garantía de 24 meses y devolución en 10 días.";

export function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(raw);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/neonnight";

export const ROUTES = {
  home: "/",
  collection: "/coleccion",
  watch: (slug: string) => `/reloj/${slug}`,
  thanks: "/gracias",
} as const;
