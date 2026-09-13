import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { ListWatches } from "@/application/use-cases/list-watches";
import type { WatchCategory } from "@/domain/entities/watch";
import { Breadcrumb } from "@/presentation/components/blocks/Breadcrumb";
import { FilterChips, type FilterState } from "@/presentation/components/blocks/FilterChips";
import { ProductGrid } from "@/presentation/components/blocks/ProductGrid";
import { JsonLd } from "@/presentation/components/seo/JsonLd";
import { ROUTES, SITE_NAME, absoluteUrl } from "@/presentation/lib/site";

export const revalidate = 3600;

const CATEGORIES: ReadonlySet<string> = new Set<WatchCategory>(["automatico", "cronografo", "gmt", "buceo"]);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parse(sp: Record<string, string | string[] | undefined>): FilterState {
  const cat = typeof sp.categoria === "string" && CATEGORIES.has(sp.categoria) ? sp.categoria : null;
  const maxRaw = typeof sp.max === "string" ? Number.parseInt(sp.max, 10) : NaN;
  const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null;
  return { categoria: cat, max };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const state = parse(await searchParams);
  const filtered = state.categoria !== null || state.max !== null;
  return {
    title: "Colección",
    description: "Todas las referencias verificadas disponibles en Neon Night.",
    alternates: { canonical: absoluteUrl(ROUTES.collection) },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const state = parse(await searchParams);
  const { watches, whatsapp } = getContainer();
  const list = await new ListWatches(watches).execute({
    category: (state.categoria as WatchCategory | null) ?? undefined,
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
                { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
                { "@type": "ListItem", position: 2, name: "Colección", item: absoluteUrl(ROUTES.collection) },
              ],
            },
            {
              "@type": "ItemList",
              name: `Colección ${SITE_NAME}`,
              itemListElement: list.map((w, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(ROUTES.watch(w.slug)), name: w.name })),
            },
          ],
        }}
      />
      <section className="relative border-b border-divider px-page pb-10 pt-16 md:pt-24">
        <Breadcrumb items={[{ label: "Inicio", href: ROUTES.home }, { label: "Colección" }]} />
        <h1 className="mb-0 mt-[22px] text-display-fluid uppercase">Colección</h1>
        <FilterChips state={state} />
      </section>
      <section className="px-page pb-section pt-16">
        {items.length > 0 ? (
          <ProductGrid items={items} columns={4} actions={false} />
        ) : (
          <p className="m-0 text-lead text-ink-2">No hay referencias que coincidan con este filtro.</p>
        )}
      </section>
    </main>
  );
}
