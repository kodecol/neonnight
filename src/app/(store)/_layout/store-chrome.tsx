import { Suspense } from "react";
import type { StoreIdentityInput } from "@/application/dto/identity.dto";
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
import { container as currentContainer } from "@/app/_lib/tenant";

/**
 * Armazón de la tienda: barra, menú, pie, bolsa, WhatsApp y medición.
 * `identity`: una identidad en borrador para la vista previa del panel.
 */
export async function StoreChrome({ children, identity }: { children: React.ReactNode; identity?: StoreIdentityInput }) {
  const container = (await currentContainer());
  const { whatsapp, content, tracking } = container;
  const [site, lines] = await Promise.all([content.get({ identity }), new ListLines(container).execute()]);
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
        <LoadingScreen wordmark={site.brand.wordmark} isotype={site.brand.isotype} />
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
