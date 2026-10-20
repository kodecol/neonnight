import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { GetWatchBySlug } from "@/application/use-cases/get-watch-by-slug";
import { WatchNotFoundError } from "@/domain/errors";
import { ProductHero } from "@/presentation/components/blocks/ProductHero";
import { ProductSubNav } from "@/presentation/components/blocks/ProductSubNav";
import { Description } from "@/presentation/components/blocks/Description";
import { Gallery } from "@/presentation/components/blocks/Gallery";
import { ParallaxBand } from "@/presentation/components/blocks/ParallaxBand";
import { SpecTable } from "@/presentation/components/blocks/SpecTable";
import { ClosingCta } from "@/presentation/components/blocks/ClosingCta";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  try {
    return await new GetWatchBySlug(getContainer().watches).execute(slug);
  } catch (e) {
    if (e instanceof WatchNotFoundError) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const watch = await load(slug);
  if (!watch) return { title: "Pieza no encontrada" };
  const { brand } = await getContainer().content.get();
  const title = `${watch.brand} ${watch.model}`;
  const description = `${watch.name} ref. ${watch.reference} · ${watch.subtitle} · ${watch.price.formatted}. Verificado en mano, garantía de 12 meses.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(ROUTES.watch(watch.slug)) },
    openGraph: { title: `${title} — ${brand.name}`, description, type: "website", url: absoluteUrl(ROUTES.watch(watch.slug)) },
  };
}

const SCHEMA_AVAILABILITY = { disponible: "https://schema.org/InStock", reservado: "https://schema.org/LimitedAvailability", vendido: "https://schema.org/SoldOut" } as const;
const SCHEMA_CONDITION = { nuevo: "https://schema.org/NewCondition", "como-nuevo": "https://schema.org/UsedCondition", excelente: "https://schema.org/UsedCondition" } as const;

export default async function WatchPage({ params }: { params: Params }) {
  const { slug } = await params;
  const watch = await load(slug);
  if (!watch) notFound();

  const { whatsapp, analytics, content } = getContainer();
  const site = await content.get();
  const canonical = absoluteUrl(ROUTES.watch(watch.slug));
  const whatsappUrl = whatsapp.forWatch({ name: watch.name, reference: watch.reference, canonicalUrl: canonical });
  void analytics.track({ name: "view_item", watchId: watch.id, slug: watch.slug, priceCents: watch.price.cents });

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: watch.name,
          sku: watch.reference,
          brand: { "@type": "Brand", name: watch.brand },
          description: watch.description.join(" "),
          image: [watch.front?.src, watch.back?.src].filter(Boolean).map((s) => absoluteUrl(s as string)),
          url: canonical,
          offers: {
            "@type": "Offer",
            url: canonical,
            price: watch.price.units,
            priceCurrency: watch.price.currency,
            availability: SCHEMA_AVAILABILITY[watch.availability],
            itemCondition: SCHEMA_CONDITION[watch.condition],
            seller: { "@type": "Organization", name: site.brand.name },
          },
        }}
      />
      <ProductHero watch={watch} />
      <ProductSubNav tabs={site.product.subnav} />
      <Description title={site.product.descriptionTitle} paragraphs={watch.description} />
      <Gallery images={watch.gallery} name={watch.name} captions={site.product.galleryCaptions} />
      <ParallaxBand image={watch.band} height="80vh" overlay={false} label={`${watch.name} imagen completa`} />
      <SpecTable specs={watch.specs} kicker={site.product.specsKicker} />
      <ClosingCta watch={watch} whatsappUrl={whatsappUrl} />
    </main>
  );
}
