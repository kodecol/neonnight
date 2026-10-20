import type { ProductDetailDto } from "@/application/dto/product.dto";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { Price } from "@/presentation/components/primitives/Price";
import { HeroVideo } from "./HeroVideo";
import { StatusBadge } from "./ProductCard";

export function ProductHero({ product }: { product: ProductDetailDto }) {
  const hero = product.hero;
  return (
    <section id="pieza" className="relative h-screen overflow-hidden bg-surface">
      {hero?.kind === "video" ? (
        <HeroVideo src={hero.video.src} poster={hero.video.poster} parallax={0.12} className="absolute inset-x-0 top-[-12%] h-[124%]" />
      ) : hero?.kind === "image" ? (
        <div data-parallax={0.12} className="absolute inset-x-0 top-[-12%] h-[124%]">
          <MediaSlot image={hero.image} sizes="100vw" priority fit="cover" className="h-full w-full" label={`${product.name} hero`} />
        </div>
      ) : (
        // Sin foto de ambiente: el recorte del producto sobre un halo de luz, como en estudio.
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_42%,rgba(255,255,255,.07),transparent_70%)]">
          <div data-parallax={0.08} className="absolute inset-x-0 bottom-[22%] top-[12%] md:bottom-[18%] md:top-[10%]">
            <MediaSlot image={product.front} sizes="(min-width:768px) 70vw, 100vw" priority fit="contain" bare className="h-full w-full" label={`${product.name} hero`} />
          </div>
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.85),rgba(0,0,0,.15)_60%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-page pb-16 lg:pb-24">
        <span className="flex items-center gap-4 text-kicker uppercase">
          {product.subtitle}
          <StatusBadge status={product.status} />
        </span>
        <h1 className="mb-2.5 mt-3.5 text-display-fluid uppercase">{product.name}</h1>
        <Price formatted={product.price.formatted} from={product.priceFrom} className="text-lead" />
      </div>
    </section>
  );
}
