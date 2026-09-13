import type { VideoDto } from "@/application/dto/watch.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { VerticalVideo } from "./VerticalVideo";

export function MotionSection({ video, whatsappUrl, content }: { video: VideoDto | null; whatsappUrl: string | null; content: SiteContent["home"]["motion"] }) {
  return (
    <section className="grid grid-cols-1 items-center gap-12 px-page py-section md:grid-cols-2 md:gap-20" data-reveal="1" aria-labelledby="motion-title">
      <div>
        <Kicker>{content.kicker}</Kicker>
        <h2 id="motion-title" className="mb-5 mt-4 text-h2-fluid uppercase">
          {content.title}
        </h2>
        <p className="mb-[30px] mt-0 max-w-[44ch] text-lead text-ink-2 [text-wrap:pretty]">{content.body}</p>
        {whatsappUrl ? (
          <Button href={whatsappUrl} variant="link" target="_blank" rel="noopener noreferrer">
            {content.cta}
          </Button>
        ) : (
          <span className="text-label uppercase text-ink-3">{content.cta} (WhatsApp pendiente)</span>
        )}
      </div>
      <div className="flex md:justify-end">
        <div className="relative w-full max-w-[420px] bg-surface [aspect-ratio:540/676]">{video && <VerticalVideo src={video.src} poster={video.poster} />}</div>
      </div>
    </section>
  );
}
