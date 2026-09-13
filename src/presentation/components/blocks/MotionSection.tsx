import type { VideoDto } from "@/application/dto/watch.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { VerticalVideo } from "./VerticalVideo";

export function MotionSection({ video, whatsappUrl }: { video: VideoDto | null; whatsappUrl: string | null }) {
  return (
    <section className="grid grid-cols-1 items-center gap-12 px-page py-section md:grid-cols-2 md:gap-20" data-reveal="1" aria-labelledby="motion-title">
      <div>
        <Kicker>En movimiento</Kicker>
        <h2 id="motion-title" className="mb-5 mt-4 text-h2-fluid uppercase">
          Video vertical de cada referencia
        </h2>
        <p className="mb-[30px] mt-0 max-w-[44ch] text-lead text-ink-2 [text-wrap:pretty]">
          Un clip corto por pieza, grabado en el showroom: dial, corona, cierre y muñeca. El mismo material que enviamos por WhatsApp antes de la compra.
        </p>
        {whatsappUrl ? (
          <Button href={whatsappUrl} variant="link" target="_blank" rel="noopener noreferrer">
            Pedir el video de una pieza
          </Button>
        ) : (
          <span className="text-label uppercase text-ink-3">Pedir el video de una pieza (WhatsApp pendiente)</span>
        )}
      </div>
      <div className="flex md:justify-end">
        <div className="relative w-full max-w-[420px] bg-surface [aspect-ratio:540/676]">
          {video && <VerticalVideo src={video.src} poster={video.poster} />}
        </div>
      </div>
    </section>
  );
}
