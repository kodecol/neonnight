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
import { INSTAGRAM_URL, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/presentation/lib/site";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["200", "400", "500", "600"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${SITE_NAME} — Relojes de lujo verificados`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "es_CO" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { whatsapp } = getContainer();
  const whatsappUrl = whatsapp.generic();
  const whatsappBase = whatsapp.isConfigured() ? (whatsappUrl ?? "").split("?")[0] ?? null : null;

  return (
    <html lang="es-CO" className={archivo.variable}>
      <body className="bg-bg text-ink antialiased">
        <CartProvider>
          <LoadingScreen />
          <Header whatsappUrl={whatsappUrl} instagramUrl={INSTAGRAM_URL} />
          {children}
          <Footer whatsappUrl={whatsappUrl} instagramUrl={INSTAGRAM_URL} />
          <CartDrawer whatsappNumberConfigured={whatsapp.isConfigured()} whatsappBase={whatsappBase} />
          <SiteEffects />
        </CartProvider>
      </body>
    </html>
  );
}
