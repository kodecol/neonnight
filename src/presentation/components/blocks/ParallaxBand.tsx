import type { ImageDto } from "@/application/dto/watch.dto";
import { MediaSlot } from "@/presentation/components/primitives/MediaSlot";
import { cn } from "@/presentation/lib/cn";

export function ParallaxBand({ image, title, height = "78vh", overlay = true, label }: { image: ImageDto | null; title?: string; height?: "78vh" | "80vh"; overlay?: boolean; label: string }) {
  return (
    <section className={cn("relative overflow-hidden bg-surface", height === "78vh" ? "h-[60vh] md:h-[78vh]" : "h-[60vh] md:h-[80vh]")} aria-label={label}>
      <div data-parallax={0.18} className="absolute inset-x-0 top-[-16%] h-[132%]">
        <MediaSlot image={image} sizes="100vw" className="h-full w-full" label={label} />
      </div>
      {overlay && <span className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden="true" />}
      {title && (
        <div className="pointer-events-none absolute inset-0 flex items-center px-page">
          <h2 className="m-0 max-w-[20ch] text-h2-fluid uppercase">{title}</h2>
        </div>
      )}
    </section>
  );
}
