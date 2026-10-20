import type { ImageDto } from "@/application/dto/product.dto";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";

export function Gallery({ images, name, captions }: { images: ImageDto[]; name: string; captions: [string, string] }) {
  const [a, b] = [images[0] ?? null, images[1] ?? null];
  if (!a && !b) return null;
  const sizes = "(min-width:768px) 45vw, 100vw";
  return (
    <section className="grid grid-cols-1 gap-10 px-page py-section md:grid-cols-2" data-reveal="1" aria-label="Galería">
      <figure className="m-0">
        <div data-parallax={0.06} className="aspect-[3/4] bg-surface">
          <MediaSlot image={a} fit="contain" sizes={sizes} className="h-full w-full" label={`${name}, ${captions[0].toLowerCase()}`} />
        </div>
        <figcaption className="mt-5 text-meta text-ink-2">{captions[0]}</figcaption>
      </figure>
      <figure className="m-0 md:mt-20">
        <div data-parallax={-0.06} className="aspect-[3/4] bg-surface">
          <MediaSlot image={b} fit="contain" sizes={sizes} className="h-full w-full" label={`${name}, ${captions[1].toLowerCase()}`} />
        </div>
        <figcaption className="mt-5 text-meta text-ink-2">{captions[1]}</figcaption>
      </figure>
    </section>
  );
}
