import type { WatchDetailDto } from "@/application/dto/watch.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { ROUTES, SITE_TAGLINE } from "@/presentation/lib/site";
import { HeroVideo } from "./HeroVideo";

export function Hero({ featured }: { featured: WatchDetailDto | null }) {
  const hero = featured?.hero ?? null;
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
        <span className="text-kicker uppercase text-ink">{featured ? `${featured.brand} · Nueva referencia` : "Neon Night"}</span>
        <h1 id="hero-title" className="my-0 mb-3 mt-3.5 text-display-fluid uppercase">
          {featured?.model ?? "Relojes verificados"}
        </h1>
        <p className="m-0 max-w-[620px] text-lead text-ink [text-wrap:pretty]">{SITE_TAGLINE}</p>
        <div className="pointer-events-auto mt-[34px] flex flex-wrap gap-4">
          {featured && <Button href={ROUTES.watch(featured.slug)}>Ver la pieza</Button>}
          <Button href={ROUTES.collection} variant="secondary">
            Toda la colección
          </Button>
        </div>
      </div>
      <a
        href="#catalogo"
        aria-label="Bajar al catálogo"
        className="absolute bottom-[34px] left-1/2 hidden h-11 w-11 md:flex -translate-x-1/2 items-center justify-center border border-border-strong [border-radius:50%] hover:border-ink"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <polyline points="2,5 7,10 12,5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </a>
    </section>
  );
}
