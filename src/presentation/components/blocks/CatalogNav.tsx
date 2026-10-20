import Link from "next/link";
import type { CatalogResultDto } from "@/application/dto/catalog.dto";
import { ActiveIntoView } from "@/presentation/components/primitives/ActiveIntoView";
import { Chip } from "@/presentation/components/primitives/Chip";
import { catalogHref, toggleValue } from "@/presentation/lib/catalog-href";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";

/** Pestañas de línea ("Todo" + las del panel). Cambiar de línea limpia los filtros: cada línea tiene los suyos. */
export function LineTabs({ result, allLabel }: { result: CatalogResultDto; allLabel: string }) {
  const tabs = [
    { href: ROUTES.collection, label: allLabel, count: result.lines.reduce((n, l) => n + l.count, 0), active: result.line === null },
    ...result.lines.filter((l) => l.count > 0).map((l) => ({ href: ROUTES.line(l.slug), label: l.label, count: l.count, active: result.line?.slug === l.slug })),
  ];
  return (
    // En móvil las pestañas se desplazan en horizontal; el degradado del borde avisa que hay más.
    <nav
      aria-label="Líneas"
      className="-mb-px mt-12 flex gap-7 overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_88%,transparent)] md:mt-14 md:gap-11 md:[mask-image:none]"
      data-testid="line-tabs"
    >
      <ActiveIntoView />
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-baseline gap-2 border-b-2 pb-4 text-label uppercase transition-colors",
            t.active ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink",
          )}
        >
          {t.label}
          <span className="text-label-sm text-ink-3 tabular-nums">{t.count}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Categorías de la línea activa como chips (una a la vez). */
export function CategoryChips({ result, base }: { result: CatalogResultDto; base: string }) {
  if (result.categories.length < 2) return null;
  const { categoria, ...rest } = result.query;
  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Categorías">
      <Chip href={catalogHref(base, rest, result.sort)} active={!categoria}>
        Todas
      </Chip>
      {result.categories.map((c) => (
        <Chip key={c.slug} href={catalogHref(base, toggleValue(result.query, "categoria", c.slug, false), result.sort)} active={c.selected}>
          {c.label}
        </Chip>
      ))}
    </div>
  );
}
