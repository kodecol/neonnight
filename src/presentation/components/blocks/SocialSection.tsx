import type { SiteContent } from "@/application/dto/site-content.dto";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { SocialIcon } from "@/presentation/components/primitives/SocialIcon";

/** Transición común: lenta, con la curva de entrada del sitio y sin animación si el usuario la reduce. */
const motion = "transition duration-700 ease-[var(--ease-reveal)] motion-reduce:transition-none";

/**
 * "Encuéntranos en redes": una fila de enlaces a cada red, separados por
 * hairlines. Al pasar el cursor (o enfocar con teclado) el fondo sube, la
 * línea magenta se traza, la flecha avanza y el handle rueda hacia la acción.
 * Solo CSS: no añade JavaScript al cliente.
 */
export function SocialSection({ content }: { content: SiteContent["social"] }) {
  return (
    <section id="redes" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="social-title">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
        <div>
          <Kicker as="p" className="m-0">
            {content.kicker}
          </Kicker>
          <h2 id="social-title" className="mb-0 mt-5 text-h2-fluid uppercase">
            {content.title}
          </h2>
        </div>
        <p className="m-0 max-w-[44ch] text-lead text-ink-2 [text-wrap:pretty] lg:justify-self-end">{content.body}</p>
      </div>

      <ul
        className={`m-0 mt-14 grid list-none grid-cols-1 gap-px border border-divider bg-divider p-0 ${content.networks.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}
        data-testid="social-links"
      >
        {content.networks.map((n, i) => (
          <li key={n.id} className="flex">
            <a
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              data-network={n.id}
              className="group relative flex min-h-[190px] w-full flex-col justify-between overflow-hidden bg-bg p-5 focus-visible:outline-offset-[-2px] md:min-h-[280px] md:p-7 lg:min-h-[340px]"
            >
              {/* Fondo que sube */}
              <span aria-hidden="true" className={`absolute inset-0 origin-bottom scale-y-0 bg-surface group-hover:scale-y-100 group-focus-visible:scale-y-100 ${motion}`} />
              {/* Línea de acento que se traza */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-accent group-hover:scale-x-100 group-focus-visible:scale-x-100 ${motion}`}
              />

              <span className="relative flex items-start justify-between">
                <span className="text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className={`text-ink-2 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent group-focus-visible:text-accent ${motion}`}
                >
                  <path d="M4 12L12 4M5.5 4H12v6.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </span>

              <span className="relative">
                <SocialIcon id={n.id} className={`h-8 w-8 text-ink group-hover:-translate-y-1.5 group-hover:text-accent group-focus-visible:text-accent lg:h-10 lg:w-10 ${motion}`} />
                <span className="mt-5 block text-h3 md:mt-6 uppercase lg:text-h2-sm">{n.label}</span>
                <span className="mt-2 block text-small text-ink-2 [text-wrap:pretty]">{n.description}</span>
                {/* Handle → acción: rueda hacia arriba */}
                <span className="mt-5 block h-4 overflow-hidden text-label uppercase">
                  <span className={`block group-hover:-translate-y-4 group-focus-visible:-translate-y-4 ${motion}`}>
                    <span className="block h-4 truncate text-ink-2">{n.handle}</span>
                    <span className="block h-4 text-accent" aria-hidden="true">
                      {n.cta} →
                    </span>
                  </span>
                </span>
                <span className="sr-only"> (abre en una pestaña nueva)</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
