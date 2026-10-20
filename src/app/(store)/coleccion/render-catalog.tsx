import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { BrowseCatalog, type RawParams } from "@/application/use-cases/browse-catalog";
import { LineNotFoundError } from "@/domain/errors";
import { Breadcrumb } from "@/presentation/components/blocks/Breadcrumb";
import { CategoryChips, LineTabs } from "@/presentation/components/blocks/CatalogNav";
import { ActiveFilters, CatalogToolbar } from "@/presentation/components/blocks/CatalogToolbar";
import { ProductGrid } from "@/presentation/components/blocks/ProductGrid";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { catalogHref } from "@/presentation/lib/catalog-href";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

/** Metadata y página comparten una sola consulta por petición. */
const browseCached = cache(async (line: string | null, paramsKey: string) => {
  try {
    return await new BrowseCatalog(getContainer()).execute({ line, params: JSON.parse(paramsKey) as RawParams });
  } catch (e) {
    if (e instanceof LineNotFoundError) notFound();
    throw e;
  }
});
const browse = (line: string | null, params: RawParams) => browseCached(line, JSON.stringify(params));

export async function catalogMetadata(line: string | null, params: RawParams): Promise<Metadata> {
  const [result, site] = await Promise.all([browse(line, params), getContainer().content.get()]);
  const filtered = Object.keys(params).length > 0;
  const base = result.line ? ROUTES.line(result.line.slug) : ROUTES.collection;
  return {
    title: result.line?.label ?? site.collection.title,
    description: result.line ? `${result.line.label} en ${site.brand.name}. ${result.line.description}` : site.brand.description,
    alternates: { canonical: absoluteUrl(base) },
    // Las combinaciones de filtros no se indexan: la URL canónica es la de la línea.
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

/** Colección completa (`line` null) o de una línea. Los filtros llegan por searchParams. */
export async function CatalogPage({ line, params }: { line: string | null; params: RawParams }) {
  const { categories, content } = getContainer();

  // Enlaces antiguos `/coleccion?categoria=gmt` → la línea de esa categoría.
  if (line === null && typeof params.categoria === "string") {
    const cat = (await categories.list()).find((c) => c.slug === params.categoria);
    if (cat) permanentRedirect(catalogHref(ROUTES.line(cat.line), { categoria: [cat.slug] }));
  }

  const [result, site] = await Promise.all([browse(line, params), content.get()]);
  const base = result.line ? ROUTES.line(result.line.slug) : ROUTES.collection;
  const title = result.line?.label ?? site.collection.title;
  const crumbs = [
    { label: site.collection.breadcrumbHome, href: ROUTES.home },
    ...(result.line ? [{ label: site.collection.title, href: ROUTES.collection }, { label: result.line.label }] : [{ label: site.collection.title }]),
  ];

  return (
    <main className="pt-header">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: absoluteUrl(c.href ?? base) })),
            },
            {
              "@type": "ItemList",
              name: `${title} ${site.brand.name}`,
              itemListElement: result.products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(ROUTES.product(p.kind, p.slug)), name: p.name })),
            },
          ],
        }}
      />
      <section className="relative border-b border-divider px-page pt-16 md:pt-24">
        <Breadcrumb items={crumbs} />
        <h1 className="mb-0 mt-[22px] text-display-fluid uppercase">{title}</h1>
        {result.line?.description && <p className="m-0 mt-5 max-w-[52ch] text-lead text-ink-2 [text-wrap:pretty]">{result.line.description}</p>}
        <LineTabs result={result} allLabel={site.collection.allLabel} />
      </section>
      {result.categories.length > 1 && (
        <div className="px-page pt-10">
          <CategoryChips result={result} base={base} />
        </div>
      )}
      <div className={result.categories.length > 1 ? "mt-10" : undefined}>
        <CatalogToolbar result={result} base={base} content={site.collection} />
      </div>
      <ActiveFilters result={result} base={base} content={site.collection} />
      <section className="px-page pb-section pt-12" aria-label="Resultados">
        {result.products.length > 0 ? (
          <ProductGrid items={result.products.map((product) => ({ product, whatsappUrl: null }))} columns={4} actions={false} />
        ) : (
          <div className="flex flex-col items-start gap-6 py-10">
            <p className="m-0 text-lead text-ink-2">{site.collection.emptyMessage}</p>
            {result.active.length > 0 && (
              <Link href={catalogHref(base, {}, result.sort)} className="border-b border-accent pb-1 text-label uppercase text-ink hover:text-accent">
                {site.collection.clearLabel}
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
