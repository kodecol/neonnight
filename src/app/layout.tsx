import type { Metadata, Viewport } from "next";
import "@/presentation/styles/globals.css";
import { fontVariables } from "./fonts";
import { GetActiveAppearance } from "@/application/use-cases/admin/appearance";
import { ThemeStyle } from "@/presentation/components/seo/ThemeStyle";
import { absoluteUrl } from "@/presentation/lib/site";
import { versioned } from "@/application/use-cases/brand-assets";
import { brandAssets } from "./_icons/render";
import { requestContainer, siteBaseUrl } from "@/app/_lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const siteBase = await siteBaseUrl();
  const { state, container } = await requestContainer();
  const [{ brand }, { version }] = await Promise.all([container.content.get(), state === "ok" ? brandAssets() : { version: "" }]);
  // Las demos nunca se indexan (y un host que no es de una demo, tampoco).
  const indexable = !container.config.demo;
  const v = (path: string) => versioned(path, version);
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const meta = process.env.META_DOMAIN_VERIFICATION?.trim();
  // Vista previa general; las fichas y las líneas ponen la suya.
  const url = absoluteUrl(v("/og/inicio.jpg"), siteBase);
  const image = { url, secureUrl: url, width: 1200, height: 630, alt: `${brand.name} — relojes, joyas y perfumes de las grandes casas`, type: "image/jpeg" };
  return {
    metadataBase: new URL(siteBase),
    title: { default: `${brand.name} — ${brand.titleSuffix}`, template: `%s — ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    // Isotipo de Identidad sobre el fondo de Apariencia; cambian de URL al publicar (`?v=`).
    icons: {
      icon: [
        { url: v("/favicon.ico"), sizes: "48x48" },
        { url: v("/icons/icon-192.png"), type: "image/png", sizes: "192x192" },
        { url: v("/icons/icon-512.png"), type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: v("/icons/apple-touch-icon.png"), sizes: "180x180" }],
    },
    manifest: v("/manifest.webmanifest"),
    openGraph: { type: "website", siteName: brand.name, locale: brand.locale.replace("-", "_"), images: [image] },
    twitter: { card: "summary_large_image", images: [{ url: image.url, alt: image.alt }] },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    formatDetection: { telephone: false },
    // Search Console y Meta Business verifican el dominio con estas etiquetas (variables de entorno).
    verification: { ...(google ? { google } : {}), ...(meta ? { other: { "facebook-domain-verification": meta } } : {}) },
  };
}

/** Color de la barra del navegador: el fondo del tema publicado (o el negro de fábrica). */
export async function generateViewport(): Promise<Viewport> {
  const appearance = await new GetActiveAppearance((await requestContainer()).container.appearance).execute();
  return { themeColor: appearance?.colors.bg ?? "#000000", colorScheme: "dark" };
}

/** Raíz mínima: la tienda pone su chrome en `(store)/layout.tsx` y el panel el suyo en `admin/`. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { container } = await requestContainer();
  const [site, appearance] = await Promise.all([container.content.get(), new GetActiveAppearance(container.appearance).execute()]);
  return (
    <html lang={site.brand.locale} className={fontVariables} data-store={container.config.slug}>
      <head>
        <ThemeStyle appearance={appearance} />
      </head>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
