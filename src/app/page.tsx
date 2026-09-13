import { getContainer } from "@/infrastructure/container";
import { ListWatches } from "@/application/use-cases/list-watches";
import { GetFeaturedWatch } from "@/application/use-cases/get-featured-watch";
import { Hero } from "@/presentation/components/blocks/Hero";
import { CatalogHeader } from "@/presentation/components/blocks/CatalogHeader";
import { ProductGrid } from "@/presentation/components/blocks/ProductGrid";
import { ParallaxBand } from "@/presentation/components/blocks/ParallaxBand";
import { TrustColumns } from "@/presentation/components/blocks/TrustColumns";
import { MotionSection } from "@/presentation/components/blocks/MotionSection";
import { InstagramGrid } from "@/presentation/components/blocks/InstagramGrid";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { INSTAGRAM_URL, ROUTES, SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/presentation/lib/site";

export const revalidate = 3600;

export default async function HomePage() {
  const { watches, whatsapp } = getContainer();
  const [all, featured] = await Promise.all([new ListWatches(watches).execute(), new GetFeaturedWatch(watches).execute()]);
  const items = all.slice(0, 6).map((w) => ({
    watch: w,
    whatsappUrl: whatsapp.forWatch({ name: w.name, reference: w.slug, canonicalUrl: absoluteUrl(ROUTES.watch(w.slug)) }),
  }));

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/"), logo: absoluteUrl("/assets/isotipo-color.png"), sameAs: [INSTAGRAM_URL] },
            { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/"), description: SITE_DESCRIPTION, inLanguage: "es-CO" },
          ],
        }}
      />
      <Hero featured={featured} />
      <CatalogHeader total={all.length} />
      <section className="px-page pb-section pt-16">
        <ProductGrid items={items} columns={3} actions />
      </section>
      <ParallaxBand image={featured?.band ?? null} title="Cada pieza pasa por verificación antes de salir" label="Detalle de calibre" />
      <TrustColumns />
      <MotionSection video={featured?.video ?? null} whatsappUrl={whatsapp.generic("Hola, quiero pedir el video de una pieza.")} />
      <InstagramGrid instagramUrl={INSTAGRAM_URL} />
    </main>
  );
}
