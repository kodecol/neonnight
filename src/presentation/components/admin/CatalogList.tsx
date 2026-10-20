"use client";
import { SmartImage as Image } from "@/presentation/components/primitives/SmartImage";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminLineDto, AdminProductRowDto } from "@/application/dto/admin.dto";
import { cn } from "@/presentation/lib/cn";

const STATUS_TONE = { disponible: "text-ink", ultimas: "text-accent", reservado: "text-ink-2", vendido: "text-ink-3", agotado: "text-ink-3" } as const;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function CatalogList({ rows, lines }: { rows: AdminProductRowDto[]; lines: AdminLineDto[] }) {
  const [q, setQ] = useState("");
  const [line, setLine] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = normalize(q.trim());
    return rows.filter((r) => (!line || r.line === line) && (!needle || normalize(`${r.name} ${r.reference} ${r.slug} ${r.categoryLabel}`).includes(needle)));
  }, [rows, q, line]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <label className="relative block w-full md:max-w-[380px]">
          <span className="sr-only">Buscar</span>
          <svg className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-ink-3" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por marca, modelo o referencia"
            className="w-full border-0 border-b border-border bg-transparent py-3 pl-7 text-meta text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por línea">
          {[{ slug: null as string | null, label: "Todas" }, ...lines.map((l) => ({ slug: l.slug as string | null, label: l.label }))].map((c) => (
            <button
              key={c.slug ?? "all"}
              type="button"
              aria-pressed={line === c.slug}
              onClick={() => setLine(c.slug)}
              className={cn(
                "cursor-pointer border px-3.5 py-2 text-label-sm uppercase transition-colors",
                line === c.slug ? "border-ink text-ink" : "border-border text-ink-2 hover:border-ink hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-[72px_minmax(0,1fr)_180px_200px_70px_130px] gap-6 border-b border-divider pb-3 text-label-sm uppercase text-ink-3 lg:grid">
        <span />
        <span>Pieza</span>
        <span>Línea · Categoría</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Stock</span>
        <span className="text-right">Estado</span>
      </div>

      {visible.length === 0 ? (
        <p className="m-0 border-b border-divider py-16 text-center text-meta text-ink-2">{rows.length === 0 ? "Aún no hay productos. Crea el primero." : "Nada coincide con la búsqueda."}</p>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="catalog-rows">
          {visible.map((r) => (
            <li key={r.id} className="border-b border-divider">
              <Link
                href={`/admin/catalogo/${r.id}`}
                className="group grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 py-4 transition-colors hover:bg-surface lg:grid-cols-[72px_minmax(0,1fr)_180px_200px_70px_130px] lg:gap-6"
              >
                <span className="relative row-span-2 block aspect-square w-16 overflow-hidden bg-surface lg:row-span-1 lg:w-[72px]">
                  {r.thumb && <Image src={r.thumb} alt="" fill sizes="72px" className="object-contain p-1.5" />}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="line-clamp-2 text-meta font-medium uppercase text-ink transition-colors group-hover:text-accent lg:truncate">{r.name}</span>
                    {r.featured && <span className="shrink-0 border border-accent px-1.5 py-0.5 text-label-sm uppercase text-accent">Destacado</span>}
                  </span>
                  <span className="mt-1 block text-label-sm uppercase text-ink-3">
                    {r.reference ? `Ref. ${r.reference}` : r.slug}
                    {r.variantCount > 1 && ` · ${r.variantCount} presentaciones`}
                  </span>
                </span>
                <span className="hidden text-small text-ink-2 lg:block">
                  {r.lineLabel} <span className="text-ink-3">·</span> {r.categoryLabel}
                </span>
                <span className="col-start-2 text-small tabular-nums text-ink-2 lg:col-start-auto lg:text-right lg:text-meta lg:text-ink">
                  {r.priceFrom && <span className="text-ink-2">Desde </span>}
                  {r.priceFormatted}
                </span>
                <span className="hidden text-right text-meta tabular-nums text-ink-2 lg:block">{r.stock}</span>
                <span className={cn("row-start-1 col-start-3 text-right text-label-sm uppercase lg:row-start-auto lg:col-start-auto", STATUS_TONE[r.status.code])}>
                  {r.status.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 mt-5 text-label-sm uppercase text-ink-3">
        {visible.length} de {rows.length} piezas
      </p>
    </div>
  );
}
