import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { ListLines } from "@/application/use-cases/list-lines";
import type { InfoPage, InfoPageSlug } from "@/application/dto/info-page.dto";
import { InfoPageView } from "@/presentation/components/info/InfoPageView";
import { LineShowcase } from "@/presentation/components/blocks/LineShowcase";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { absoluteUrl } from "@/presentation/lib/site";
import { OG_PATHS, ogImage, shareMetadata } from "./og";

/** Qué otras páginas se sugieren al pie de cada una. */
const RELATED: Record<InfoPageSlug, InfoPageSlug[]> = {
  nosotros: ["envios", "garantia", "devoluciones", "pagos"],
  envios: ["pagos", "garantia", "devoluciones", "terminos"],
  pagos: ["envios", "devoluciones", "terminos", "privacidad"],
  garantia: ["devoluciones", "envios", "terminos", "nosotros"],
  devoluciones: ["garantia", "envios", "pagos", "terminos"],
  terminos: ["privacidad", "devoluciones", "garantia", "envios"],
  privacidad: ["terminos", "nosotros", "devoluciones", "pagos"],
};

export async function infoMetadata(slug: InfoPageSlug): Promise<Metadata> {
  const { content } = getContainer();
  const [page, site] = await Promise.all([content.page(slug), content.get()]);
  if (!page) return {};
  const url = absoluteUrl(`/${slug}`);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    ...shareMetadata({ title: `${page.title} — ${site.brand.name}`, description: page.description, url, siteName: site.brand.name, locale: site.brand.locale, image: ogImage(OG_PATHS.home, `${page.title} — ${site.brand.name}`) }),
  };
}

/** `preview`: la página ya armada con el borrador del panel (vista previa, sin datos estructurados). */
export async function InfoRoute({ slug, preview }: { slug: InfoPageSlug; preview?: InfoPage }) {
  const container = getContainer();
  const { content, whatsapp } = container;
  const [published, site] = await Promise.all([preview ? null : content.page(slug), content.get()]);
  const page = preview ?? published;
  if (!page) notFound();
  const lines = slug === "nosotros" ? await new ListLines(container).execute() : [];
  const url = absoluteUrl(`/${slug}`);

  return (
    <>
      {!preview && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": slug === "nosotros" ? "AboutPage" : "WebPage",
                name: page.title,
                description: page.description,
                url,
                inLanguage: site.brand.locale,
                dateModified: page.updatedAt,
                isPartOf: { "@type": "WebSite", name: site.brand.name, url: absoluteUrl("/") },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: site.collection.breadcrumbHome, item: absoluteUrl("/") },
                  { "@type": "ListItem", position: 2, name: site.info.related[slug].label, item: url },
                ],
              },
            ],
          }}
        />
      )}
      <InfoPageView
        page={page}
        copy={site.info}
        breadcrumbHome={site.collection.breadcrumbHome}
        breadcrumbLabel={site.info.related[slug].label}
        related={RELATED[slug].map((s) => ({ href: `/${s}`, ...site.info.related[s] }))}
        whatsappUrl={whatsapp.generic()}
        contactEmail={site.company.email}
      >
        {lines.length > 0 && <LineShowcase lines={lines} content={site.home.lines} />}
      </InfoPageView>
    </>
  );
}
