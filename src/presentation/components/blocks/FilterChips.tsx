import type { SiteContent } from "@/application/dto/site-content.dto";
import { Chip } from "@/presentation/components/primitives/Chip";
import { ROUTES } from "@/presentation/lib/site";

export interface FilterState {
  categoria: string | null;
  max: number | null;
}

export function filterHref(q: { category?: string; maxPriceUnits?: number }): string {
  const sp = new URLSearchParams();
  if (q.category) sp.set("categoria", q.category);
  if (q.maxPriceUnits) sp.set("max", String(q.maxPriceUnits));
  const s = sp.toString();
  return s ? `${ROUTES.collection}?${s}` : ROUTES.collection;
}

export function FilterChips({ state, filters }: { state: FilterState; filters: SiteContent["collection"]["filters"] }) {
  return (
    <div className="mt-[38px] flex flex-wrap gap-3.5" role="group" aria-label="Filtros">
      {filters.map((f) => {
        const active = (f.category ?? null) === state.categoria && (f.maxPriceUnits ?? null) === state.max;
        return (
          <Chip key={f.label} href={filterHref(f)} active={active}>
            {f.label}
          </Chip>
        );
      })}
    </div>
  );
}
