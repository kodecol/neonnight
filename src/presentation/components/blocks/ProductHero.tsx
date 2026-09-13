import type { WatchDetailDto } from "@/application/dto/watch.dto";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { HeroVideo } from "./HeroVideo";

export function ProductHero({ watch }: { watch: WatchDetailDto }) {
  const hero = watch.hero;
  return (
    <section id="pieza" className="relative h-screen overflow-hidden bg-surface">
      {hero?.kind === "video" ? (
        <HeroVideo src={hero.video.src} poster={hero.video.poster} parallax={0.12} className="absolute inset-x-0 top-[-12%] h-[124%]" />
      ) : (
        <div data-parallax={0.12} className="absolute inset-x-0 top-[-12%] h-[124%]">
          <MediaSlot image={hero?.kind === "image" ? hero.image : watch.front} sizes="100vw" priority fit={hero ? "cover" : "contain"} className="h-full w-full" label={`${watch.name} hero`} />
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.85),rgba(0,0,0,.15)_60%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-page pb-16 lg:pb-24">
        <span className="text-kicker uppercase">{watch.subtitle}</span>
        <h1 className="mb-2.5 mt-3.5 text-display-fluid uppercase">{watch.name}</h1>
        <span className="text-lead text-ink">{watch.price.formatted}</span>
      </div>
    </section>
  );
}
