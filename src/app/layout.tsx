import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "@/presentation/styles/globals.css";
import { getContainer } from "@/infrastructure/container";
import { CartProvider } from "@/presentation/hooks/use-cart";
import { Header } from "@/presentation/components/chrome/Header";
import { Footer } from "@/presentation/components/chrome/Footer";
import { CartDrawer } from "@/presentation/components/chrome/CartDrawer";
import { LoadingScreen } from "@/presentation/components/chrome/LoadingScreen";
import { SiteEffects } from "@/presentation/components/chrome/SiteEffects";
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
    title: { default: `${brand.name} — Relojes de lujo verificados`, template: `%s — ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    openGraph: { type: "website", siteName: brand.name, locale: brand.locale.replace("-", "_") },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { whatsapp, content } = getContainer();
  const site = await content.get();
  const whatsappUrl = whatsapp.generic();
  const whatsappBase = whatsapp.isConfigured() ? (whatsappUrl ?? "").split("?")[0] ?? null : null;

  return (
    <html lang={site.brand.locale} className={archivo.variable}>
      <body className="bg-bg text-ink antialiased">
        <CartProvider>
          <LoadingScreen wordmark={site.brand.wordmark} />
          <Header whatsappUrl={whatsappUrl} instagramUrl={site.social.instagram.url} navigation={site.navigation} brand={site.brand} />
          {children}
          <Footer content={site.footer} tagline={site.brand.tagline} whatsappUrl={whatsappUrl} />
          <CartDrawer whatsappNumberConfigured={whatsapp.isConfigured()} whatsappBase={whatsappBase} content={site.cart} />
          <SiteEffects />
        </CartProvider>
      </body>
    </html>
  );
}
