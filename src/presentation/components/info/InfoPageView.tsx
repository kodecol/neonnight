import Link from "next/link";
import type { InfoPage } from "@/application/dto/info-page.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Breadcrumb } from "@/presentation/components/blocks/Breadcrumb";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { InfoBlocks } from "./InfoBlocks";
import { TableOfContents } from "./TableOfContents";

const formatDate = (iso: string) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export interface RelatedLink {
  label: string;
  href: string;
  body: string;
}

/**
 * Plantilla de las páginas institucionales. `legal`: índice lateral fijo,
 * vigencia y versión, ancho de lectura cómodo. `editorial` (Nosotros):
 * títulos grandes en dos columnas y pasos en rejilla.
 */
export function InfoPageView({
  page,
  copy,
  breadcrumbHome,
  breadcrumbLabel,
  related,
  whatsappUrl,
  contactEmail,
  children,
}: {
  page: InfoPage;
  copy: SiteContent["info"];
  breadcrumbHome: string;
  /** Nombre corto de la página en la miga ("Nosotros"). */
  breadcrumbLabel: string;
  related: RelatedLink[];
  whatsappUrl: string | null;
  contactEmail: string;
  /** Contenido extra al final (p. ej. las líneas en Nosotros). */
  children?: React.ReactNode;
}) {
  const legal = page.layout === "legal";
  return (
    <main className="pt-header" data-testid={`info-${page.slug}`}>
      <header className="border-b border-divider px-page pb-14 pt-12 md:pb-20 md:pt-16">
        <Breadcrumb items={[{ label: breadcrumbHome, href: "/" }, { label: breadcrumbLabel }]} />
        <Kicker className="mt-10">{page.kicker}</Kicker>
        <h1 className="mb-0 mt-4 max-w-[18ch] text-display-fluid uppercase [text-wrap:balance]">{page.title}</h1>
        <p className="mb-0 mt-7 max-w-[62ch] text-lead text-ink-2 [text-wrap:pretty]">{page.lead}</p>
        {legal && (
          <p className="mb-0 mt-8 text-legal text-ink-3">
            <time dateTime={page.updatedAt}>{fill(copy.effectiveTemplate, { date: formatDate(page.updatedAt), version: page.version })}</time>
          </p>
        )}
      </header>

      {legal ? (
        <div className="grid gap-12 px-page py-section lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <TableOfContents items={page.sections.map((s) => ({ id: s.id, title: s.title }))} label={copy.tocLabel} />
          </aside>
          <article className="flex max-w-[78ch] flex-col">
            {page.sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-[calc(var(--spacing-header)+24px)] border-t border-divider py-12 first:border-t-0 first:pt-0">
                <h2 id={`${s.id}-title`} className="mb-7 mt-0 flex items-baseline gap-4 text-h3 uppercase">
                  <span className="text-label tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <InfoBlocks blocks={s.blocks} />
              </section>
            ))}
          </article>
        </div>
      ) : (
        <div className="flex flex-col">
          {page.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="grid gap-10 border-b border-divider px-page py-section lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <h2 id={`${s.id}-title`} className="m-0 text-h2-fluid uppercase [text-wrap:balance]">
                {s.title}
              </h2>
              <div className={s.blocks.some((b) => b.type === "steps") ? "lg:col-span-2" : undefined}>
                <InfoBlocks blocks={s.blocks} editorial />
              </div>
            </section>
          ))}
        </div>
      )}

      {children}

      <section className="grid gap-12 border-t border-divider px-page py-section lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20" aria-labelledby="info-help-title">
        <div className="flex flex-col gap-6">
          <Kicker>{copy.help.kicker}</Kicker>
          <h2 id="info-help-title" className="m-0 text-h2-fluid uppercase">
            {copy.help.title}
          </h2>
          <p className="m-0 max-w-[44ch] text-meta text-ink-2">{copy.help.body}</p>
          <div className="flex flex-wrap gap-3">
            {whatsappUrl && (
              <Button href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                {copy.help.whatsapp}
              </Button>
            )}
            <Button href={`mailto:${contactEmail}`} variant="secondary">
              {contactEmail}
            </Button>
          </div>
        </div>
        <nav aria-label="Más información" className="grid gap-px self-start border border-divider bg-divider sm:grid-cols-2">
          {related.map((r) => (
            <Link key={r.href} href={r.href} className="group flex flex-col gap-2 bg-bg p-6 transition-colors hover:bg-surface">
              <span className="flex items-center justify-between text-label-lg uppercase text-ink">
                {r.label}
                <span aria-hidden="true" className="text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-accent">
                  →
                </span>
              </span>
              <span className="text-small text-ink-2">{r.body}</span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
