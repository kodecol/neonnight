import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { ListWatches } from "@/application/use-cases/list-watches";
import { Breadcrumb } from "@/presentation/components/blocks/Breadcrumb";
import { FilterChips, type FilterState } from "@/presentation/components/blocks/FilterChips";
import { ProductGrid } from "@/presentation/components/blocks/ProductGrid";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parse(sp: Record<string, string | string[] | undefined>, categories: ReadonlySet<string>): FilterState {
  const cat = typeof sp.categoria === "string" && categories.has(sp.categoria) ? sp.categoria : null;
  const maxRaw = typeof sp.max === "string" ? Number.parseInt(sp.max, 10) : NaN;
  const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null;
  return { categoria: cat, max };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = typeof sp.categoria === "string" || typeof sp.max === "string";
  return {
    title: "Colección",
    description: "Todas las referencias verificadas disponibles en Neon Night.",
    alternates: { canonical: absoluteUrl(ROUTES.collection) },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const { watches, categories, whatsapp, content } = getContainer();
  const [site, cats] = await Promise.all([content.get(), categories.list()]);
  const state = parse(await searchParams, new Set(cats.map((c) => c.slug)));
  // Chips: "Todas" + categorías administrables + filtros de precio del contenido.
  const filters = [
    ...site.collection.filters.filter((f) => f.maxPriceUnits === undefined),
    ...cats.map((c) => ({ label: c.label, category: c.slug })),
    ...site.collection.filters.filter((f) => f.maxPriceUnits !== undefined),
  ];
  const list = await new ListWatches(watches).execute({
    category: state.categoria ?? undefined,
    maxPriceUnits: state.max ?? undefined,
  });
  const items = list.map((w) => ({
    watch: w,
    whatsappUrl: whatsapp.forWatch({ name: w.name, reference: w.slug, canonicalUrl: absoluteUrl(ROUTES.watch(w.slug)) }),
  }));

  return (
    <main className="pt-header">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: site.collection.breadcrumbHome, item: absoluteUrl("/") },
                { "@type": "ListItem", position: 2, name: site.collection.title, item: absoluteUrl(ROUTES.collection) },
              ],
            },
            {
              "@type": "ItemList",
              name: `${site.collection.title} ${site.brand.name}`,
              itemListElement: list.map((w, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(ROUTES.watch(w.slug)), name: w.name })),
            },
          ],
        }}
      />
      <section className="relative border-b border-divider px-page pb-10 pt-16 md:pt-24">
        <Breadcrumb items={[{ label: site.collection.breadcrumbHome, href: ROUTES.home }, { label: site.collection.title }]} />
        <h1 className="mb-0 mt-[22px] text-display-fluid uppercase">{site.collection.title}</h1>
        <FilterChips state={state} filters={filters} />
      </section>
      <section className="px-page pb-section pt-16">
        {items.length > 0 ? (
          <ProductGrid items={items} columns={4} actions={false} />
        ) : (
          <p className="m-0 text-lead text-ink-2">{site.collection.emptyMessage}</p>
        )}
      </section>
    </main>
  );
}
