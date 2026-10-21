import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { getContainer } from "@/infrastructure/container";
import { GetProductBySlug } from "@/application/use-cases/get-product-by-slug";
import { ListRelatedProducts } from "@/application/use-cases/list-related-products";
import type { ProductDetailDto } from "@/application/dto/product.dto";
import type { ProductKind } from "@/domain/entities/product";
import { ProductNotFoundError } from "@/domain/errors";
import { ProductHero } from "@/presentation/components/blocks/ProductHero";
import { ProductSubNav } from "@/presentation/components/blocks/ProductSubNav";
import { Description } from "@/presentation/components/blocks/Description";
import { NotesPyramid } from "@/presentation/components/blocks/NotesPyramid";
import { Gallery } from "@/presentation/components/blocks/Gallery";
import { ParallaxBand } from "@/presentation/components/blocks/ParallaxBand";
import { SpecTable } from "@/presentation/components/blocks/SpecTable";
import { ClosingCta } from "@/presentation/components/blocks/ClosingCta";
import { ProductGrid } from "@/presentation/components/blocks/ProductGrid";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { OG_PATHS, ogImage, shareMetadata } from "../_info/og";
import { TrackEvent } from "@/presentation/components/seo/TrackEvent";
import { WhatsAppMessage } from "@/presentation/components/chrome/WhatsAppFab";
import { merchantReturnPolicy, shippingDetails } from "@/presentation/lib/structured-data";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

/** Metadata, imagen OG y página comparten una consulta por petición. */
export const loadProduct = cache(async (slug: string): Promise<ProductDetailDto | null> => {
  try {
    return await new GetProductBySlug(getContainer().products).execute(slug);
  } catch (e) {
    if (e instanceof ProductNotFoundError) return null;
    throw e;
  }
});

export async function productMetadata(slug: string): Promise<Metadata> {
  const product = await loadProduct(slug);
  if (!product) return { title: "Pieza no encontrada" };
  const { brand, brand: { locale } } = await getContainer().content.get();
  const ref = product.reference ? ` ref. ${product.reference}` : "";
  const price = `${product.priceFrom ? "desde " : ""}${product.price.formatted}`;
  const description = `${product.name}${ref} · ${product.subtitle} · ${price}. Verificado en mano, con garantía y envío asegurado.`;
  const url = absoluteUrl(ROUTES.product(product.kind, product.slug));
  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    ...shareMetadata({ title: `${product.name} — ${brand.name}`, description, url, siteName: brand.name, locale, image: ogImage(OG_PATHS.product(product.slug), product.name) }),
    // Facebook y Pinterest leen el precio sin cambiar og:type.
    other: { "product:price:amount": String(product.price.units), "product:price:currency": product.price.currency },
  };
}

const SCHEMA_AVAILABILITY = {
  disponible: "https://schema.org/InStock",
  ultimas: "https://schema.org/LimitedAvailability",
  reservado: "https://schema.org/LimitedAvailability",
  vendido: "https://schema.org/SoldOut",
  agotado: "https://schema.org/OutOfStock",
} as const;
const SCHEMA_CONDITION = { nuevo: "https://schema.org/NewCondition", "como-nuevo": "https://schema.org/UsedCondition", excelente: "https://schema.org/UsedCondition" } as const;

/**
 * Detalle de producto. Las rutas /reloj, /joya, /perfume y /producto son
 * finas y delegan aquí; si el slug pertenece a otra plantilla, redirige a su URL.
 */
export async function ProductPage({ slug, kind }: { slug: string; kind: ProductKind }) {
  const product = await loadProduct(slug);
  if (!product) notFound();
  if (product.kind !== kind) permanentRedirect(ROUTES.product(product.kind, product.slug));

  const { whatsapp, analytics, content, products, lines } = getContainer();
  const [site, related, allLines] = await Promise.all([content.get(), new ListRelatedProducts(products).execute(product.slug), lines.list()]);
  const line = allLines.find((l) => l.slug === product.line) ?? null;
  const copy = site.product.byKind[product.kind];
  const canonical = absoluteUrl(ROUTES.product(product.kind, product.slug));
  const whatsappUrl = whatsapp.forProduct({ name: product.name, reference: product.reference, canonicalUrl: canonical });
  void analytics.track({ name: "view_item", productId: product.id, slug: product.slug, priceCents: product.price.cents });
  const trackItem = { id: product.id, name: product.name, brand: product.brand, category: line?.label, priceCents: product.price.cents };

  const tabs = [
    { id: "pieza", label: copy.pieceTab },
    { id: "detalles", label: site.product.tabs.details },
    ...(product.notes ? [{ id: "notas", label: site.product.tabs.notes }] : []),
    { id: "especificaciones", label: site.product.tabs.specs },
    { id: "compra", label: site.product.tabs.purchase },
  ];
  const images = [product.front?.src, product.back?.src, ...product.gallery.map((g) => g.src)].filter((s): s is string => Boolean(s));
  const offerBase = {
    priceCurrency: product.price.currency,
    itemCondition: SCHEMA_CONDITION[product.condition],
    seller: { "@type": "Organization", name: site.brand.name },
    shippingDetails: shippingDetails(site),
    hasMerchantReturnPolicy: merchantReturnPolicy(site),
  };
  // Una oferta por presentación: Google la necesita así para mostrar precio y envío.
  const offers = product.variants.map((v) => ({
    "@type": "Offer",
    url: canonical,
    ...(product.variants.length > 1 ? { name: v.label, sku: `${product.reference || product.slug}-${v.id}` } : {}),
    price: v.price.units,
    availability: v.purchasable || product.variants.length === 1 ? SCHEMA_AVAILABILITY[product.status.code] : "https://schema.org/OutOfStock",
    ...offerBase,
  }));

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: product.name,
              sku: product.reference || product.slug,
              brand: { "@type": "Brand", name: product.brand },
              ...(line ? { category: line.label } : {}),
              description: product.description.join(" "),
              image: [...new Set(images)].map((s) => absoluteUrl(s)),
              url: canonical,
              additionalProperty: product.specs.map((s) => ({ "@type": "PropertyValue", name: s.label, value: s.value })),
              offers: offers.length === 1 ? offers[0] : offers,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: site.collection.breadcrumbHome, item: absoluteUrl(ROUTES.home) },
                ...(line ? [{ "@type": "ListItem", position: 2, name: line.label, item: absoluteUrl(ROUTES.line(line.slug)) }] : []),
                { "@type": "ListItem", position: line ? 3 : 2, name: product.name, item: canonical },
              ],
            },
          ],
        }}
      />
      <TrackEvent event={{ name: "view_item", item: trackItem }} />
      <WhatsAppMessage href={whatsappUrl} />
      <ProductHero product={product} />
      <ProductSubNav tabs={tabs} />
      <Description title={copy.descriptionTitle} paragraphs={product.description} />
      {product.notes && <NotesPyramid notes={product.notes} content={site.product.notes} />}
      <Gallery images={product.gallery} name={product.name} captions={copy.galleryCaptions} />
      {product.band && <ParallaxBand image={product.band} height="80vh" overlay={false} label={`${product.name} imagen completa`} />}
      <SpecTable rows={product.specs} kicker={site.product.specsKicker} />
      <ClosingCta product={product} content={site.product.purchase} legalNote={site.cart.legalNote} variantLabel={copy.variantLabel} />
      {related.length > 0 && (
        <section className="border-t border-divider px-page pb-section pt-section" aria-labelledby="related-title" data-reveal="1">
          <Kicker>{site.product.related.kicker}</Kicker>
          <h2 id="related-title" className="mb-12 mt-4 text-h2-fluid uppercase">
            {site.product.related.title}
          </h2>
          <ProductGrid items={related.map((p) => ({ product: p }))} columns={4} actions={false} />
        </section>
      )}
    </main>
  );
}
