import Link from "next/link";
import { SORT_OPTIONS, type CatalogResultDto } from "@/application/dto/catalog.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Disclosure } from "@/presentation/components/primitives/Disclosure";
import { catalogHref, toggleValue, withoutValue } from "@/presentation/lib/catalog-href";
import { cn } from "@/presentation/lib/cn";

type Content = SiteContent["collection"];

/**
 * Barra fija bajo el header: resultados, filtros por facetas y orden. Los
 * filtros son enlaces (sin JS, compartibles); el panel se queda abierto
 * mientras se combinan opciones.
 */
export function CatalogToolbar({ result, base, content }: { result: CatalogResultDto; base: string; content: Content }) {
  const count = result.products.length;
  const facetCount = result.active.filter((a) => a.key !== "categoria").length;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === result.sort)!.label;

  return (
    <div className="backdrop-glass sticky top-header z-40 border-b border-divider bg-glass" data-testid="catalog-toolbar">
      <div className="relative flex h-[60px] items-center justify-between gap-6 px-page">
        <p className="m-0 whitespace-nowrap text-label uppercase text-ink-2" aria-live="polite" data-testid="results-count">
          {count === 1 ? content.resultsOne : fill(content.resultsTemplate, { count })}
        </p>
        <div className="flex h-full items-center gap-6 text-label uppercase md:gap-10">
          {result.facets.length > 0 && (
            <Disclosure
              testId="filter-panel"
              summary={
                <span>
                  {content.filterLabel}
                  {facetCount > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[11px] leading-none tracking-normal text-ink">{facetCount}</span>}
                </span>
              }
              summaryClassName="h-[60px] text-ink hover:text-accent"
            >
              <FilterPanel result={result} base={base} content={content} />
            </Disclosure>
          )}
          <Disclosure
            closeOnNavigate
            className="relative"
            summary={
              <span>
                <span className="hidden text-ink-2 md:inline">{content.sortLabel}: </span>
                <span className="md:hidden">{content.sortLabel}</span>
                <span className="hidden md:inline">{sortLabel}</span>
              </span>
            }
            summaryClassName="h-[60px] text-ink hover:text-accent"
          >
            <ul className="absolute right-0 top-full m-0 flex min-w-[260px] list-none flex-col border border-divider bg-surface-elevated p-0 py-2" aria-label={content.sortLabel}>
              {SORT_OPTIONS.map((o) => (
                <li key={o.value}>
                  <Link
                    href={catalogHref(base, result.query, o.value)}
                    scroll={false}
                    aria-current={o.value === result.sort ? "true" : undefined}
                    className={cn("block px-5 py-3 text-label-sm uppercase transition-colors hover:text-ink", o.value === result.sort ? "text-ink" : "text-ink-2")}
                  >
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ result, base, content }: { result: CatalogResultDto; base: string; content: Content }) {
  return (
    <div className="absolute inset-x-0 top-full max-h-[calc(100vh-132px)] overflow-y-auto border-b border-divider bg-surface-elevated px-page pb-10 pt-8">
      <div className="grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {result.facets.map((f) => (
          <fieldset key={f.key} className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-4 p-0 text-kicker uppercase text-ink-3">{f.label}</legend>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {f.options.map((o) => (
                <li key={o.value}>
                  <Link
                    href={catalogHref(base, toggleValue(result.query, f.key, o.value, f.multi), result.sort)}
                    scroll={false}
                    data-testid={`facet-${f.key}-${o.value}`}
                    className={cn("group/opt flex items-center gap-3 py-1.5 text-small normal-case tracking-normal transition-colors", o.selected ? "text-ink" : "text-ink-2 hover:text-ink")}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
                        o.selected ? "border-ink bg-ink" : "border-border group-hover/opt:border-ink",
                        !f.multi && "[border-radius:50%]",
                      )}
                    >
                      {o.selected && <span className={cn("h-1.5 w-1.5 bg-bg", !f.multi && "[border-radius:50%]")} />}
                    </span>
                    <span className="sr-only">{o.selected ? "Quitar filtro:" : "Filtrar por:"}</span>
                    <span className="flex-1">{o.label}</span>
                    <span className="text-legal tabular-nums text-ink-3">{o.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      {result.active.length > 0 && (
        <Link href={catalogHref(base, {}, result.sort)} scroll={false} className="mt-9 inline-block border-b border-accent pb-1 text-label uppercase text-ink hover:text-accent">
          {content.clearLabel}
        </Link>
      )}
    </div>
  );
}

/** Filtros activos como etiquetas que se quitan con un clic. */
export function ActiveFilters({ result, base, content }: { result: CatalogResultDto; base: string; content: Content }) {
  if (result.active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-page pt-8" aria-label="Filtros activos" role="group">
      {result.active.map((a) => (
        <Link
          key={`${a.key}:${a.value}`}
          href={catalogHref(base, withoutValue(result.query, a.key, a.value), result.sort)}
          scroll={false}
          className="group inline-flex items-center gap-2.5 border border-border px-3.5 py-2 text-label-sm uppercase text-ink transition-colors hover:border-ink"
        >
          {a.label}
          <span aria-hidden="true" className="text-ink-3 transition-colors group-hover:text-accent">
            ×
          </span>
          <span className="sr-only">(quitar)</span>
        </Link>
      ))}
      <Link href={catalogHref(base, {}, result.sort)} scroll={false} className="ml-2 text-label-sm uppercase text-ink-2 hover:text-ink">
        {content.clearLabel}
      </Link>
    </div>
  );
}
