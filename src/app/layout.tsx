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
  return {
    metadataBase: siteUrl(),
    title: { default: `${brand.name} — Relojes, joyas y perfumes verificados`, template: `%s — ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    openGraph: { type: "website", siteName: brand.name, locale: brand.locale.replace("-", "_") },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
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
