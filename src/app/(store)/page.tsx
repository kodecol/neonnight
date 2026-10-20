import { getContainer } from "@/infrastructure/container";
import { ListProducts } from "@/application/use-cases/list-products";
import { GetFeaturedProduct } from "@/application/use-cases/get-featured-product";
import { ListLines } from "@/application/use-cases/list-lines";
import { Hero } from "@/presentation/components/blocks/Hero";
import { LineShowcase } from "@/presentation/components/blocks/LineShowcase";
import { CatalogHeader } from "@/presentation/components/blocks/CatalogHeader";
import { ProductGrid } from "@/presentation/components/blocks/ProductGrid";
import { ParallaxBand } from "@/presentation/components/blocks/ParallaxBand";
import { TrustColumns } from "@/presentation/components/blocks/TrustColumns";
import { MotionSection } from "@/presentation/components/blocks/MotionSection";
import { SocialSection } from "@/presentation/components/blocks/SocialSection";
import { BrandMarquee } from "@/presentation/components/blocks/BrandMarquee";
import { Testimonials } from "@/presentation/components/blocks/Testimonials";
import { PaymentMethods } from "@/presentation/components/blocks/PaymentMethods";
import { ListBrands } from "@/application/use-cases/list-brands";
import { GetHomeContent } from "@/application/use-cases/admin/home";
import type { Metadata } from "next";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { TrackEvent } from "@/presentation/components/seo/TrackEvent";
import { onlineStore, whatsappPhone } from "@/presentation/lib/structured-data";
import { ogImage } from "./_info/og";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getContainer().content.get();
  const title = `${brand.name} — Relojes, joyas y perfumes verificados`;
  return {
    title: { absolute: title },
    alternates: { canonical: absoluteUrl(ROUTES.home) },
    openGraph: { type: "website", url: absoluteUrl(ROUTES.home), title, description: brand.description, siteName: brand.name, images: [ogImage(brand.name)] },
  };
}

export default async function HomePage() {
  const container = getContainer();
  const { products, whatsapp, content } = container;
  const site = await content.get();
  const [selection, total, featured, brands, lines, custom] = await Promise.all([
    // Selección corta y variada: una pieza de cada línea por turno.
    new ListProducts(products).execute({ mixLines: true, limit: site.home.catalog.featuredCount }),
    products.findAll().then((all) => all.length),
    new GetFeaturedProduct(products).execute(),
    new ListBrands(products).execute(),
    new ListLines(container).execute(),
    // Lo que se edita en el panel › Inicio (hero y banda); lo vacío usa los textos por defecto.
    new GetHomeContent(container).execute({ kicker: site.home.hero.fallbackKicker, cta: site.home.hero.primaryCta }),
  ]);
  const items = selection.map((p) => ({ product: p }));

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            onlineStore(site, { telephone: whatsappPhone(whatsapp.generic()) }),
            { "@type": "WebSite", name: site.brand.name, url: absoluteUrl("/"), description: site.brand.description, inLanguage: site.brand.locale, publisher: { "@id": absoluteUrl("/#tienda") } },
          ],
        }}
      />
      <TrackEvent event={{ name: "view_item_list", listName: "Inicio · Selección", items: selection.map((p) => ({ id: p.id, name: p.name, brand: p.brand, priceCents: p.price.cents })) }} />
      <Hero featured={featured} custom={custom.hero} content={site.home.hero} tagline={site.brand.tagline} />
      <BrandMarquee brands={brands} content={site.home.brands} />
      <LineShowcase lines={lines} content={site.home.lines} />
      <CatalogHeader total={total} content={site.home.catalog} />
      <section className="px-page pb-section pt-16">
        <ProductGrid items={items} columns={3} actions />
      </section>
      <ParallaxBand image={custom.band?.image ?? site.home.band.image} title={custom.band?.title ?? site.home.band.title} label={(custom.band?.image.alt || site.home.band.image.alt) ?? ""} />
      <TrustColumns content={site.home.trust} />
      <Testimonials content={site.home.testimonials} />
      <MotionSection video={featured?.video ?? null} whatsappUrl={whatsapp.generic(site.home.motion.whatsappMessage)} content={site.home.motion} />
      <PaymentMethods content={site.home.payments} whatsappUrl={whatsapp.generic(site.home.payments.whatsappMessage)} />
      <SocialSection content={site.social} />
    </main>
  );
}
