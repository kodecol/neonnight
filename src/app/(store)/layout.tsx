import { getContainer } from "@/infrastructure/container";
import { CartProvider } from "@/presentation/hooks/use-cart";
import { Header } from "@/presentation/components/chrome/Header";
import { Footer } from "@/presentation/components/chrome/Footer";
import { CartDrawer } from "@/presentation/components/chrome/CartDrawer";
import { LoadingScreen } from "@/presentation/components/chrome/LoadingScreen";
import { SiteEffects } from "@/presentation/components/chrome/SiteEffects";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { whatsapp, content } = getContainer();
  const site = await content.get();
  const whatsappUrl = whatsapp.generic();
  const instagramUrl = site.social.networks.find((n) => n.id === "instagram")?.href ?? "";
  const whatsappBase = whatsapp.isConfigured() ? (whatsappUrl ?? "").split("?")[0] ?? null : null;

  return (
    <CartProvider>
      <LoadingScreen wordmark={site.brand.wordmark} />
      <Header whatsappUrl={whatsappUrl} instagramUrl={instagramUrl} navigation={site.navigation} brand={site.brand} />
      {children}
      <Footer content={site.footer} tagline={site.brand.tagline} whatsappUrl={whatsappUrl} />
      <CartDrawer whatsappNumberConfigured={whatsapp.isConfigured()} whatsappBase={whatsappBase} content={site.cart} />
      <SiteEffects />
    </CartProvider>
  );
}
