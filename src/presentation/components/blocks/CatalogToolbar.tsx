import Link from "next/link";
import { SORT_OPTIONS, type CatalogResultDto } from "@/application/dto/catalog.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Disclosure } from "@/presentation/components/primitives/Disclosure";
import { CloseDetailsButton } from "@/presentation/components/primitives/CloseDetailsButton";
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
          {(result.facets.length > 0 || result.price) && (
            <Disclosure
              testId="filter-panel"
              revealOnOpen
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

const optionCls = (selected: boolean) => cn("group/opt flex items-center gap-3 py-1.5 text-small normal-case tracking-normal transition-colors", selected ? "text-ink" : "text-ink-2 hover:text-ink");

function Mark({ selected, round }: { selected: boolean; round: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
        selected ? "border-ink bg-ink" : "border-border group-hover/opt:border-ink",
        round && "[border-radius:50%]",
      )}
    >
      {selected && <span className={cn("h-1.5 w-1.5 bg-bg", round && "[border-radius:50%]")} />}
    </span>
  );
}

const digits = (n: number | null | undefined) => (n === null || n === undefined ? "" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n));

/**
 * Precio: tramos sugeridos (enlaces) y un rango libre con dos campos. El
 * formulario es GET, así que funciona sin JS y deja el filtro en la URL.
 */
function PriceBlock({ result, base }: { result: CatalogResultDto; base: string }) {
  const price = result.price!;
  const rest = Object.entries(result.query).filter(([k]) => k !== "precio");
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0 md:col-span-2" data-testid="price-filter">
      <legend className="mb-4 p-0 text-kicker uppercase text-ink-3">Precio</legend>
      <p className="m-0 mb-3 text-legal normal-case tracking-normal text-ink-3" data-testid="price-range">
        En esta vista: {price.minLabel} – {price.maxLabel}
      </p>
      {price.options.length > 0 && (
        <ul className="m-0 mb-5 grid list-none grid-cols-1 gap-x-8 p-0 md:grid-cols-2">
          {price.options.map((o) => {
            const next = { ...result.query };
            if (o.selected) delete next.precio;
            else next.precio = [o.value];
            return (
              <li key={o.value}>
                <Link href={catalogHref(base, next, result.sort)} scroll={false} data-testid={`price-${o.value}`} className={optionCls(o.selected)}>
                  <Mark selected={o.selected} round />
                  <span className="sr-only">{o.selected ? "Quitar filtro:" : "Filtrar por:"}</span>
                  <span className="flex-1">{o.label}</span>
                  <span className="text-legal tabular-nums text-ink-3">{o.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <form method="get" action={base} className="flex flex-wrap items-end gap-3 normal-case tracking-normal" aria-label="Rango de precio">
        {rest.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v.join(",")} />
        ))}
        {result.sort !== "novedades" && <input type="hidden" name="orden" value={result.sort} />}
        <label className="flex min-w-[140px] flex-1 flex-col gap-1.5">
          <span className="text-label-sm uppercase text-ink-3">Desde</span>
          <input
            name="precio_min"
            inputMode="numeric"
            defaultValue={digits(price.selected?.min)}
            placeholder={digits(price.min)}
            aria-describedby="price-range-hint"
            className="border border-border bg-transparent px-3 py-2.5 text-small tabular-nums text-ink outline-none placeholder:text-ink-3 focus:border-ink"
            data-testid="price-min"
          />
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1.5">
          <span className="text-label-sm uppercase text-ink-3">Hasta</span>
          <input
            name="precio_max"
            inputMode="numeric"
            defaultValue={digits(price.selected?.max)}
            placeholder={digits(price.max)}
            aria-describedby="price-range-hint"
            className="border border-border bg-transparent px-3 py-2.5 text-small tabular-nums text-ink outline-none placeholder:text-ink-3 focus:border-ink"
            data-testid="price-max"
          />
        </label>
        <button type="submit" className="cursor-pointer border border-border-strong px-4 py-2.5 text-label-sm uppercase text-ink transition-colors hover:border-ink" data-testid="price-apply">
          Aplicar
        </button>
        <span id="price-range-hint" className="sr-only">
          En pesos colombianos. Deja un campo vacío para no poner límite por ese lado.
        </span>
      </form>
    </fieldset>
  );
}

function FilterPanel({ result, base, content }: { result: CatalogResultDto; base: string; content: Content }) {
  const count = result.products.length;
  return (
    <div className="absolute inset-x-0 top-full flex max-h-[calc(100dvh-132px)] flex-col border-b border-divider bg-surface-elevated">
      <div className="scroll-fade-y overflow-y-auto overscroll-contain px-page pb-8 pt-8">
        <div className="grid grid-cols-1 gap-x-12 gap-y-9 md:grid-cols-2 lg:grid-cols-4">
          {result.price && <PriceBlock result={result} base={base} />}
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
                      className={optionCls(o.selected)}
                    >
                      <Mark selected={o.selected} round={!f.multi} />
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
      </div>
      {/* Pie fijo del panel: en móvil es la forma cómoda de volver a los resultados. */}
      <div className="flex items-center justify-between gap-4 border-t border-divider bg-surface-elevated px-page py-4">
        {result.active.length > 0 ? (
          <Link href={catalogHref(base, {}, result.sort)} scroll={false} className="border-b border-accent pb-1 text-label uppercase text-ink hover:text-accent" data-testid="filters-clear">
            {content.clearLabel}
          </Link>
        ) : (
          <span />
        )}
        <CloseDetailsButton className="cursor-pointer bg-ink px-5 py-3 text-label uppercase text-bg transition-colors hover:bg-ink-2" testId="filters-done">
          {count === 1 ? "Ver 1 pieza" : `Ver ${count} piezas`}
        </CloseDetailsButton>
      </div>
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
