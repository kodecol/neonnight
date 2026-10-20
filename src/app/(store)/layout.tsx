import { Suspense } from "react";
import { getContainer } from "@/infrastructure/container";
import { ListLines } from "@/application/use-cases/list-lines";
import { ROUTES } from "@/presentation/lib/site";
import { CartProvider } from "@/presentation/hooks/use-cart";
import { Header } from "@/presentation/components/chrome/Header";
import { Footer } from "@/presentation/components/chrome/Footer";
import { CartDrawer } from "@/presentation/components/chrome/CartDrawer";
import { LoadingScreen } from "@/presentation/components/chrome/LoadingScreen";
import { SiteEffects } from "@/presentation/components/chrome/SiteEffects";
import { WhatsAppProvider } from "@/presentation/components/chrome/WhatsAppFab";
import { ConsentBanner } from "@/presentation/components/chrome/ConsentBanner";
import { Tracking } from "@/presentation/components/chrome/Tracking";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const container = getContainer();
  const { whatsapp, content, tracking } = container;
  const [site, lines] = await Promise.all([content.get(), new ListLines(container).execute()]);
  // El menú abre con las líneas del catálogo (administrables) y sigue con los enlaces fijos.
  const navigation = { ...site.navigation, menu: [...lines.map((l) => ({ label: l.label, href: ROUTES.line(l.slug) })), ...site.navigation.menu] };
  const whatsappUrl = whatsapp.generic();
  const instagramUrl = site.social.networks.find((n) => n.id === "instagram")?.href ?? "";
  const whatsappBase = whatsapp.isConfigured() ? (whatsappUrl ?? "").split("?")[0] ?? null : null;
  // Sin IDs de medición no hay cookies opcionales: ni banner ni preferencias.
  const trackingEnabled = Boolean(tracking.gaId || tracking.pixelId);

  return (
    <CartProvider>
      <WhatsAppProvider href={whatsappUrl} label={site.navigation.menuFooter.whatsappLabel}>
        <LoadingScreen wordmark={site.brand.wordmark} />
        <Header whatsappUrl={whatsappUrl} instagramUrl={instagramUrl} navigation={navigation} brand={site.brand} />
        {children}
        <Footer content={site.footer} brand={site.brand} company={site.company} networks={site.social.networks} whatsappUrl={whatsappUrl} trackingEnabled={trackingEnabled} />
        <CartDrawer whatsappNumberConfigured={whatsapp.isConfigured()} whatsappBase={whatsappBase} content={site.cart} />
        <SiteEffects />
        {trackingEnabled && (
          <>
            <Suspense fallback={null}>
              <Tracking gaId={tracking.gaId} pixelId={tracking.pixelId} />
            </Suspense>
            <ConsentBanner content={site.consent} />
          </>
        )}
      </WhatsAppProvider>
    </CartProvider>
  );
}
