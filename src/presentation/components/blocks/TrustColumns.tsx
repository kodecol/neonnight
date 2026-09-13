import type { SiteContent } from "@/application/dto/site-content.dto";
import { Kicker } from "@/presentation/components/primitives/Kicker";

export function TrustColumns({ content }: { content: SiteContent["home"]["trust"] }) {
  return (
    <section id="autenticidad" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="trust-kicker">
      <Kicker as="p" className="m-0">
        <span id="trust-kicker">{content.kicker}</span>
      </Kicker>
      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3">
        {content.items.map((it) => (
          <div key={it.number} className={it.accent ? "border-t-2 border-accent pt-6" : "border-t-2 border-ink pt-6"}>
            <div className={it.accent ? "text-number text-accent" : "text-number"}>{it.number}</div>
            <h3 className="mb-3 mt-[18px] text-h3 uppercase">{it.title}</h3>
            <p className="m-0 text-body text-ink-2 [text-wrap:pretty]">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
