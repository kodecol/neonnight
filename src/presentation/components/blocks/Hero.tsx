import type { ProductDetailDto } from "@/application/dto/product.dto";
import type { HomeHeroDto } from "@/application/dto/home.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Button } from "@/presentation/components/primitives/Button";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { ROUTES } from "@/presentation/lib/site";
import { HeroVideo } from "./HeroVideo";

/**
 * Hero de la home. Sin `custom` sigue a la pieza destacada del catálogo; con
 * `custom` (panel › Inicio) usa la foto o el video y los textos elegidos.
 */
export function Hero({ featured, custom, content, tagline }: { featured: ProductDetailDto | null; custom?: HomeHeroDto | null; content: SiteContent["home"]["hero"]; tagline: string }) {
  const hero = custom ? custom.media : (featured?.hero ?? null);
  const kicker = custom ? custom.kicker : featured ? fill(content.kickerTemplate, { brand: featured.brand }) : content.fallbackKicker;
  const title = custom ? custom.title : (featured?.model ?? content.fallbackTitle);
  const text = custom ? custom.text : tagline;
  const cta = custom ? custom.cta : featured ? { label: content.primaryCta, href: ROUTES.product(featured.kind, featured.slug) } : null;
  return (
    <section className="relative h-screen overflow-hidden bg-surface" aria-labelledby="hero-title">
      {hero?.kind === "video" ? (
        <HeroVideo src={hero.video.src} poster={hero.video.poster} parallax={0.12} className="absolute inset-x-0 top-[-12%] h-[124%]" />
      ) : (
        <div data-parallax={0.12} className="absolute inset-x-0 top-[-12%] h-[124%]">
          <MediaSlot image={hero?.kind === "image" ? hero.image : null} sizes="100vw" priority className="h-full w-full" label="Hero" />
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.85)_0%,rgba(0,0,0,.15)_55%,rgba(0,0,0,.5)_100%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-page pb-12 md:pb-16 lg:pb-[88px]">
        <span className="text-kicker uppercase text-ink">{kicker}</span>
        <h1 id="hero-title" className="my-0 mb-3 mt-3.5 text-display-fluid uppercase">
          {title}
        </h1>
        {text && <p className="m-0 max-w-[620px] text-lead text-ink [text-wrap:pretty]">{text}</p>}
        <div className="pointer-events-auto mt-[34px] flex flex-wrap gap-4">
          {cta && <Button href={cta.href}>{cta.label}</Button>}
          <Button href={ROUTES.collection} variant="secondary">
            {content.secondaryCta}
          </Button>
        </div>
      </div>
      <a
        href="#catalogo"
        aria-label="Bajar al catálogo"
        className="absolute bottom-[34px] left-1/2 hidden h-11 w-11 -translate-x-1/2 items-center justify-center border border-border-strong [border-radius:50%] hover:border-ink md:flex"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <polyline points="2,5 7,10 12,5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </a>
    </section>
  );
}
