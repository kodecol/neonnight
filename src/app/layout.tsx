import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "@/presentation/styles/globals.css";
import { getContainer } from "@/infrastructure/container";
import { siteUrl } from "@/presentation/lib/site";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["200", "400", "500", "600"],
  display: "swap",
  variable: "--font-archivo",
});

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getContainer().content.get();
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const meta = process.env.META_DOMAIN_VERIFICATION?.trim();
  // Vista previa general; las fichas y las líneas ponen la suya.
  const image = { url: "/og", width: 1200, height: 630, alt: `${brand.name} — relojes, joyas y perfumes de las grandes casas`, type: "image/png" };
  return {
    metadataBase: siteUrl(),
    title: { default: `${brand.name} — Relojes, joyas y perfumes verificados`, template: `%s — ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    openGraph: { type: "website", siteName: brand.name, locale: brand.locale.replace("-", "_"), images: [image] },
    twitter: { card: "summary_large_image", images: [image.url] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    formatDetection: { telephone: false },
    // Search Console y Meta Business verifican el dominio con estas etiquetas (variables de entorno).
    verification: { ...(google ? { google } : {}), ...(meta ? { other: { "facebook-domain-verification": meta } } : {}) },
  };
}

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

/** Raíz mínima: la tienda pone su chrome en `(store)/layout.tsx` y el panel el suyo en `admin/`. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getContainer().content.get();
  return (
    <html lang={site.brand.locale} className={archivo.variable}>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
