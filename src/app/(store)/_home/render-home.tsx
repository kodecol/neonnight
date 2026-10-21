import { Fragment, type ReactNode } from "react";
import { getContainer } from "@/infrastructure/container";
import type { StoreIdentityInput } from "@/application/dto/identity.dto";
import { ListProducts } from "@/application/use-cases/list-products";
import { GetFeaturedProduct } from "@/application/use-cases/get-featured-product";
import { ListLines } from "@/application/use-cases/list-lines";
import { ListMarqueeBrands } from "@/application/use-cases/list-brands";
import { GetHomeContent } from "@/application/use-cases/admin/home";
import type { HomeBlockId } from "@/application/ports/home-settings";
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
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { TrackEvent } from "@/presentation/components/seo/TrackEvent";
import { onlineStore, whatsappPhone } from "@/presentation/lib/structured-data";
import { absoluteUrl } from "@/presentation/lib/site";

/**
 * Cuerpo de la home. Los bloques salen en el orden y con la visibilidad del
 * panel › Inicio (el hero siempre primero). `preview` usa el borrador: lo
 * pinta /admin/vista-previa y nunca la tienda pública.
 */
export async function HomeView({ preview = false, identity }: { preview?: boolean; identity?: StoreIdentityInput }) {
  const container = getContainer();
  const { products, whatsapp, content } = container;
  const base = await content.get({ identity });
  const [selection, total, featured, brands, lines, custom] = await Promise.all([
    // Selección corta y variada: una pieza de cada línea por turno.
    new ListProducts(products).execute({ mixLines: true, limit: base.home.catalog.featuredCount }),
    products.findAll().then((all) => all.length),
    new GetFeaturedProduct(products).execute(),
    new ListMarqueeBrands(container).execute({ label: base.home.brands.label, disclaimer: base.home.brands.disclaimer }),
    new ListLines(container).execute(),
    // Lo editado en el panel › Inicio; lo vacío usa los textos por defecto.
    new GetHomeContent(container).execute({ kicker: base.home.hero.fallbackKicker, cta: base.home.hero.primaryCta }, { preview }),
  ]);
  // Mismo contenido que el resto del sitio (empresa, envíos…), con los ajustes de Inicio que tocan (borrador en la vista previa).
  const site = preview ? await content.get({ home: custom.settings, identity }) : base;
  const items = selection.map((p) => ({ product: p }));

  const blocks: Record<HomeBlockId, ReactNode> = {
    marcas: <BrandMarquee content={brands} />,
    lineas: <LineShowcase lines={lines} content={site.home.lines} />,
    seleccion: (
      <>
        <CatalogHeader total={total} content={site.home.catalog} />
        <section className="px-page pb-section pt-16">
          <ProductGrid items={items} columns={3} actions />
        </section>
      </>
    ),
    banda: <ParallaxBand image={custom.band?.image ?? site.home.band.image} title={custom.band?.title ?? site.home.band.title} label={(custom.band?.image.alt || site.home.band.image.alt) ?? ""} />,
    garantia: <TrustColumns content={site.home.trust} />,
    testimonios: <Testimonials content={site.home.testimonials} />,
    movimiento: <MotionSection video={featured?.video ?? null} whatsappUrl={whatsapp.generic(site.home.motion.whatsappMessage)} content={site.home.motion} />,
    pagos: <PaymentMethods content={site.home.payments} whatsappUrl={whatsapp.generic(site.home.payments.whatsappMessage)} />,
    redes: <SocialSection content={site.social} />,
  };

  return (
    <main>
      {!preview && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              onlineStore(site, { telephone: whatsappPhone(whatsapp.generic()) }),
              { "@type": "WebSite", name: site.brand.name, url: absoluteUrl("/"), description: site.brand.description, inLanguage: site.brand.locale, publisher: { "@id": absoluteUrl("/#tienda") } },
            ],
          }}
        />
      )}
      {!preview && <TrackEvent event={{ name: "view_item_list", listName: "Inicio · Selección", items: selection.map((p) => ({ id: p.id, name: p.name, brand: p.brand, priceCents: p.price.cents })) }} />}
      <Hero featured={featured} custom={custom.hero} content={site.home.hero} tagline={site.brand.tagline} />
      {custom.layout
        .filter((b) => b.visible)
        .map((b) => (
          <Fragment key={b.id}>{blocks[b.id]}</Fragment>
        ))}
    </main>
  );
}
