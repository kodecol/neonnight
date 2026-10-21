import type { Metadata } from "next";
import { absoluteUrl } from "@/presentation/lib/site";
import { versioned } from "@/application/use-cases/brand-assets";
import { brandAssets } from "../../_icons/render";

/**
 * Vistas previas al compartir (1200 × 630, JPEG) con URLs estables: una
 * general, una por línea y una por pieza. Ver `app/og/[...path]/route.ts`.
 */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const OG_PATHS = {
  home: "/og/inicio.jpg",
  line: (slug: string) => `/og/linea/${encodeURIComponent(slug)}.jpg`,
  product: (slug: string) => `/og/producto/${encodeURIComponent(slug)}.jpg`,
};

/**
 * Con `?v=` de la última publicación de Identidad o Apariencia: al cambiar el
 * nombre, el isotipo o los colores, las redes piden la imagen nueva.
 */
export async function ogImage(path: string, alt: string) {
  const url = absoluteUrl(versioned(path, (await brandAssets()).version));
  return { url, secureUrl: url, ...OG_IMAGE_SIZE, alt, type: "image/jpeg" };
}

/** og:* y twitter:* con la misma imagen, título y descripción. */
export function shareMetadata(o: { title: string; description: string; url: string; siteName: string; locale: string; image: Awaited<ReturnType<typeof ogImage>> }): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", url: o.url, title: o.title, description: o.description, siteName: o.siteName, locale: o.locale.replace("-", "_"), images: [o.image] },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [{ url: o.image.url, alt: o.image.alt }] },
  };
}
