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
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const container = getContainer();
  const { products, whatsapp, content } = container;
  const site = await content.get();
  const [selection, total, featured, brands, lines] = await Promise.all([
    // Selección corta y variada: una pieza de cada línea por turno.
    new ListProducts(products).execute({ mixLines: true, limit: site.home.catalog.featuredCount }),
    products.findAll().then((all) => all.length),
    new GetFeaturedProduct(products).execute(),
    new ListBrands(products).execute(),
    new ListLines(container).execute(),
  ]);
  const items = selection.map((p) => ({
    product: p,
    whatsappUrl: whatsapp.forProduct({ name: p.name, reference: p.reference, canonicalUrl: absoluteUrl(ROUTES.product(p.kind, p.slug)) }),
  }));

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: site.brand.name, url: absoluteUrl("/"), logo: absoluteUrl(site.brand.logo.color), sameAs: site.social.networks.map((n) => n.href) },
            { "@type": "WebSite", name: site.brand.name, url: absoluteUrl("/"), description: site.brand.description, inLanguage: site.brand.locale },
          ],
        }}
      />
      <Hero featured={featured} content={site.home.hero} tagline={site.brand.tagline} />
      <BrandMarquee brands={brands} content={site.home.brands} />
      <LineShowcase lines={lines} content={site.home.lines} />
      <CatalogHeader total={total} content={site.home.catalog} />
      <section className="px-page pb-section pt-16">
        <ProductGrid items={items} columns={3} actions />
      </section>
      <ParallaxBand image={site.home.band.image} title={site.home.band.title} label={site.home.band.image.alt} />
      <TrustColumns content={site.home.trust} />
      <Testimonials content={site.home.testimonials} />
      <MotionSection video={featured?.video ?? null} whatsappUrl={whatsapp.generic(site.home.motion.whatsappMessage)} content={site.home.motion} />
      <PaymentMethods content={site.home.payments} whatsappUrl={whatsapp.generic(site.home.payments.whatsappMessage)} />
      <SocialSection content={site.social} />
    </main>
  );
}
