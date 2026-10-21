import Link from "next/link";
import type { LineDto } from "@/application/dto/catalog.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";

/**
 * Portadas de las líneas: una columna por línea, foto vertical a sangre con
 * el nombre encima. Con una sola línea no se muestra (no hay nada que elegir).
 */
export function LineShowcase({ lines, content }: { lines: LineDto[]; content: SiteContent["home"]["lines"] }) {
  if (lines.length < 2) return null;
  return (
    <section className="border-b border-divider px-page pb-section pt-section" aria-labelledby="lines-title" data-testid="line-showcase">
      <div data-reveal="1">
        <Kicker>{content.kicker}</Kicker>
        <h2 id="lines-title" className="mb-0 mt-4 max-w-[24ch] text-h2-fluid uppercase">
          {content.title}
        </h2>
      </div>
      <ul className={cn("m-0 mt-14 grid list-none grid-cols-1 gap-6 p-0 md:gap-8", lines.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {lines.map((l) => (
          <li key={l.slug} data-reveal="1">
            <Link href={ROUTES.line(l.slug)} className="group relative block aspect-[4/5] overflow-hidden bg-surface">
              <div className="absolute inset-0 transition-transform duration-[1200ms] ease-[cubic-bezier(.215,.61,.355,1)] group-hover:scale-[1.04]">
                <MediaSlot image={l.cover} sizes="(min-width:768px) 33vw, 100vw" className="h-full w-full" label={l.label} />
              </div>
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-bg)_82%,transparent),color-mix(in_srgb,var(--color-bg)_5%,transparent)_55%)]" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-7 md:p-8">
                <span className="text-kicker uppercase text-ink-2">{fill(content.countTemplate, { count: l.count })}</span>
                <h3 className="m-0 text-h2-sm uppercase md:text-h2">{l.label}</h3>
                <p className="m-0 max-w-[34ch] text-small text-ink-2 [text-wrap:pretty]">{l.description}</p>
                <span className="mt-3 w-fit border-b border-accent pb-1.5 text-label uppercase text-ink transition-colors group-hover:text-accent">
                  {fill(content.ctaTemplate, { label: l.label.toLowerCase() })}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
