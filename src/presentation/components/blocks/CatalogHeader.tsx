import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { ROUTES } from "@/presentation/lib/site";

export function CatalogHeader({ total, content }: { total: number; content: SiteContent["home"]["catalog"] }) {
  return (
    <section id="catalogo" className="border-b border-divider px-page pb-10 pt-section" data-reveal="1">
      <div className="flex flex-wrap items-end justify-between gap-10">
        <div>
          <Kicker>{content.kicker}</Kicker>
          <h2 className="mb-0 mt-4 max-w-[22ch] text-h2-fluid uppercase md:max-w-[30ch]">{content.title}</h2>
        </div>
        <Button href={ROUTES.collection} variant="link">
          {fill(content.ctaTemplate, { count: total })}
        </Button>
      </div>
    </section>
  );
}
