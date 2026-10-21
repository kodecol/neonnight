"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { SiteContent, Testimonial } from "@/application/dto/site-content.dto";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { cn } from "@/presentation/lib/cn";

const ROTATE_MS = 6500;
const SWIPE_PX = 40;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Distancia circular de la tarjeta `i` a la activa: …, -1, 0, 1, … */
function offset(i: number, active: number, n: number): number {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/** Coverflow: la activa al frente; las vecinas giran hacia el centro, se alejan en Z y se atenúan. */
function cardStyle(d: number): CSSProperties {
  const a = Math.abs(d);
  return {
    transform: `translateX(calc(-50% + ${d * 74}%)) translateZ(${-a * 240}px) rotateY(${-d * 34}deg) scale(${1 - a * 0.06})`,
    opacity: a === 0 ? 1 : a === 1 ? 0.5 : 0,
    zIndex: 10 - a,
    pointerEvents: a > 1 ? "none" : undefined,
  };
}

/**
 * Testimonios en carrusel horizontal con perspectiva: avanza solo cada 6,5 s
 * (pausa al pasar el cursor o enfocar), se arrastra en táctil, responde a las
 * flechas del teclado y a los segmentos de progreso. Sin avance automático ni
 * transiciones con prefers-reduced-motion.
 */
export function Testimonials({ content }: { content: SiteContent["home"]["testimonials"] }) {
  const items = content.items;
  const n = items.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [touched, setTouched] = useState(false);
  const dragX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const running = !paused && !reduced && n > 1;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % n), ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [running, active, n]);

  const go = useCallback(
    (i: number) => {
      setTouched(true);
      setActive(((i % n) + n) % n);
    },
    [n],
  );

  if (n === 0) return null;

  return (
    <section
      id="clientes"
      className="overflow-x-clip border-b border-divider px-page py-section"
      data-reveal="1"
      aria-labelledby="testimonials-title"
      aria-roledescription="carrusel"
    >
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <Kicker as="p" className="m-0">
            {content.kicker}
          </Kicker>
          <h2 id="testimonials-title" className="mb-0 mt-5 font-display text-[22px] uppercase leading-[27px] tracking-[-0.3px] [text-wrap:balance] md:max-w-[22ch] md:text-h2-fluid lg:max-w-none">
            {content.title}
          </h2>
        </div>
        <p className="m-0 max-w-[36ch] text-small text-ink-2">{content.note}</p>
      </div>

      {/* Escenario 3D */}
      <div
        className="relative mt-14 h-[500px] touch-pan-y select-none [perspective:1800px] md:mt-20 md:h-[520px]"
        tabIndex={0}
        aria-label="Testimonios. Usa las flechas izquierda y derecha para navegar."
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(active + 1);
          if (e.key === "ArrowLeft") go(active - 1);
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={(e) => (dragX.current = e.clientX)}
        onPointerUp={(e) => {
          if (dragX.current === null) return;
          const dx = e.clientX - dragX.current;
          dragX.current = null;
          if (dx <= -SWIPE_PX) go(active + 1);
          else if (dx >= SWIPE_PX) go(active - 1);
        }}
      >
        {items.map((t, i) => {
          const d = offset(i, active, n);
          return (
            <div
              key={`${t.name}-${i}`}
              role="group"
              aria-roledescription="testimonio"
              aria-label={`${i + 1} de ${n}`}
              aria-hidden={d !== 0 || undefined}
              onClick={d !== 0 ? () => go(i) : undefined}
              style={cardStyle(d)}
              className={cn(
                "absolute left-1/2 top-0 h-full w-[min(86vw,620px)] transition-[transform,opacity] duration-[900ms] ease-[var(--ease-reveal)] [transform-style:preserve-3d] motion-reduce:transition-none",
                d !== 0 && "cursor-pointer",
              )}
            >
              <Card t={t} active={d === 0} />
            </div>
          );
        })}
      </div>

      {/* Controles */}
      <div className="mx-auto mt-10 flex w-full max-w-[620px] items-center gap-3 sm:gap-6">
        <NavButton label="Testimonio anterior" dir="prev" onClick={() => go(active - 1)} />
        {/* Cada botón mide al menos 24 px (WCAG 2.5.8): se tocan entre sí y la línea deja el aire; con muchos, dos filas. */}
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(24px,1fr))]" role="group" aria-label="Elegir testimonio">
          {items.map((t, i) => (
            <button
              key={`${t.name}-dot-${i}`}
              type="button"
              onClick={() => go(i)}
              aria-label={`Testimonio ${i + 1}: ${t.name}`}
              aria-current={i === active ? "true" : undefined}
              className="group relative h-6 cursor-pointer"
            >
              <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2">
                <span className="absolute inset-0 bg-divider transition-colors group-hover:bg-ink-2" />
                {i === active && (
                  <span
                    key={`${active}-${running}`}
                    className={cn("absolute inset-y-0 left-0 bg-accent", running ? "nn-progress" : "w-full")}
                    style={running ? { animationDuration: `${ROTATE_MS}ms` } : undefined}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <span className="hidden w-14 text-right text-label tabular-nums text-ink-2 sm:block" aria-hidden="true">
          <span className="text-ink">{String(active + 1).padStart(2, "0")}</span>/{String(n).padStart(2, "0")}
        </span>
        <NavButton label="Testimonio siguiente" dir="next" onClick={() => go(active + 1)} />
      </div>
      <p className="sr-only" aria-live={touched ? "polite" : "off"}>
        {items[active] ? `${items[active].name}: ${items[active].quote}` : ""}
      </p>
    </section>
  );
}

/** El degradado mezcla texto y fondo del tema: de fábrica da #181818 → #0c0c0c → #050505. */
function Card({ t, active }: { t: Testimonial; active: boolean }) {
  const stars = Math.max(0, Math.min(5, Math.round(t.rating)));
  return (
    <figure
      className={cn(
        "relative m-0 flex h-full flex-col overflow-hidden border bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-ink)_9.41%,var(--color-bg))_0%,color-mix(in_srgb,var(--color-ink)_4.71%,var(--color-bg))_52%,color-mix(in_srgb,var(--color-ink)_1.96%,var(--color-bg))_100%)] p-7 transition-colors duration-700 md:p-10",
        active ? "border-border-strong" : "border-divider",
      )}
    >
      {/* Halo de color detrás de la activa */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_28%,transparent),transparent)] transition-opacity duration-1000",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Línea de acento */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,var(--color-accent),color-mix(in_srgb,var(--color-accent)_0%,transparent)_75%)]" />
      {/* Reflejo que cruza la tarjeta al volverse activa */}
      {active && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="nn-sheen absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(105deg,transparent,color-mix(in_srgb,var(--color-ink)_7%,transparent),transparent)]" />
        </span>
      )}
      {/* Comilla de marca de agua */}
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-4 select-none text-[260px] font-extralight leading-none text-accent opacity-[0.08]">
        ”
      </span>

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <span className="flex gap-1.5" role="img" aria-label={`${stars} de 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={i < stars ? "text-accent" : "text-ink-3"}>
              <path d="M7 1.2l1.7 3.6 3.9.5-2.9 2.7.7 3.9L7 10l-3.4 1.9.7-3.9L1.4 5.3l3.9-.5z" fill="currentColor" />
            </svg>
          ))}
        </span>
        <span className="border border-border px-3 py-1.5 text-label-sm uppercase text-ink-2">{t.piece}</span>
      </div>

      <blockquote className="relative m-0 mt-8 flex-1">
        <p className="m-0 text-[20px] font-extralight leading-[31px] text-ink [text-wrap:pretty] md:text-[24px] md:leading-[37px]">“{t.quote}”</p>
      </blockquote>

      <figcaption className="relative mt-8 flex items-center gap-4 border-t border-divider pt-6">
        <span className="bg-[linear-gradient(135deg,var(--color-accent),color-mix(in_srgb,var(--color-accent)_10%,transparent))] p-px" aria-hidden="true">
          <span className="flex h-12 w-12 items-center justify-center bg-bg text-label text-ink">{initials(t.name)}</span>
        </span>
        <span>
          <span className="block text-label-lg uppercase text-ink">{t.name}</span>
          <span className="mt-1.5 block text-small text-ink-2">{t.city}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function NavButton({ label, onClick, dir }: { label: string; onClick: () => void; dir: "prev" | "next" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border border-border-strong text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-bg"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={dir === "prev" ? "rotate-180" : undefined}>
        <path d="M2 8h12M9.5 3.5 14 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </button>
  );
}
