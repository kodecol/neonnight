import type { CSSProperties } from "react";
import type { SiteContent } from "@/application/dto/site-content.dto";

/** Mínimo de marcas por pista para que el bucle cubra pantallas anchas aunque haya pocas. */
const MIN_ITEMS = 8;
const SECONDS_PER_ITEM = 4.5;
/** Área visual común (px² a escala de escritorio): iguala el peso óptico de logos anchos y compactos. */
const LOGO_AREA = 8200;

type LogoStyle = CSSProperties & { "--logo": string; "--h": string; "--r": string; "--brand": string };

/**
 * Banda de marcas en desplazamiento continuo con logos oficiales en blanco;
 * al pasar el cursor el marquee se detiene y el logo toma su color de marca.
 * Los extremos se funden con el fondo. La pista es decorativa: los lectores
 * de pantalla reciben la lista de marcas una sola vez.
 */
export function BrandMarquee({ brands, content }: { brands: string[]; content: SiteContent["home"]["brands"] }) {
  if (brands.length === 0) return null;
  const reps = Math.max(1, Math.ceil(MIN_ITEMS / brands.length));
  const items = Array.from({ length: reps }, () => brands).flat();
  const style = { "--nn-marquee-duration": `${items.length * SECONDS_PER_ITEM}s` } as CSSProperties;

  const item = (brand: string, key: string) => {
    const logo = content.logos[brand.toLowerCase()];
    return (
      <span key={key} className="flex items-center">
        <span className="flex h-[72px] items-center px-10 md:h-[96px] md:px-14 lg:h-[120px] lg:px-20">
          {logo ? (
            <span
              className="nn-brand-logo"
              style={{ "--logo": `url(${logo.src})`, "--h": `${Math.sqrt(LOGO_AREA / logo.ratio).toFixed(1)}px`, "--r": String(logo.ratio), "--brand": logo.color } as LogoStyle}
            />
          ) : (
            <span className="whitespace-nowrap text-[32px] font-medium uppercase leading-none tracking-[-0.5px] text-ink md:text-[44px] lg:text-[56px]">{brand}</span>
          )}
        </span>
        <span className="h-1 w-1 shrink-0 bg-ink-3" />
      </span>
    );
  };

  return (
    <section id="marcas" className="border-b border-divider py-12 md:py-16" aria-labelledby="brands-label" data-testid="brand-marquee">
      <div className="mb-6 px-page md:mb-8">
        <h2 id="brands-label" className="m-0 text-kicker font-normal uppercase text-ink-2">
          {content.label}
        </h2>
        <ul className="sr-only">
          {brands.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
      <div className="nn-marquee overflow-hidden" aria-hidden="true">
        <div className="nn-marquee-track" style={style}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {items.map((b, i) => item(b, `${copy}-${i}`))}
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 mt-6 px-page text-legal text-ink-2 md:mt-8">{content.disclaimer}</p>
    </section>
  );
}
