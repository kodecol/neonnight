import { Chip } from "@/presentation/components/primitives/Chip";
import { ROUTES } from "@/presentation/lib/site";

export interface FilterState {
  categoria: string | null;
  max: number | null;
}

export const FILTERS: Array<{ label: string; query: Partial<FilterState> }> = [
  { label: "Todas", query: {} },
  { label: "Automáticos", query: { categoria: "automatico" } },
  { label: "Cronógrafos", query: { categoria: "cronografo" } },
  { label: "Hasta $15.000.000", query: { max: 15_000_000 } },
];

export function filterHref(q: Partial<FilterState>): string {
  const sp = new URLSearchParams();
  if (q.categoria) sp.set("categoria", q.categoria);
  if (q.max) sp.set("max", String(q.max));
  const s = sp.toString();
  return s ? `${ROUTES.collection}?${s}` : ROUTES.collection;
}

export function FilterChips({ state }: { state: FilterState }) {
  return (
    <div className="mt-[38px] flex flex-wrap gap-3.5" role="group" aria-label="Filtros">
      {FILTERS.map((f) => {
        const active = (f.query.categoria ?? null) === state.categoria && (f.query.max ?? null) === state.max;
        return (
          <Chip key={f.label} href={filterHref(f.query)} active={active}>
            {f.label}
          </Chip>
        );
      })}
    </div>
  );
}
