import type { ProductDetailDto } from "@/application/dto/product.dto";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { cn } from "@/presentation/lib/cn";

/** Salida, corazón y fondo en tres columnas: cómo cambia la fragancia con las horas. */
export function NotesPyramid({ notes, content }: { notes: NonNullable<ProductDetailDto["notes"]>; content: SiteContent["product"]["notes"] }) {
  const tiers = [
    { key: "top", text: content.top, items: notes.top },
    { key: "heart", text: content.heart, items: notes.heart },
    { key: "base", text: content.base, items: notes.base },
  ].filter((t) => t.items.length > 0);
  if (tiers.length === 0) return null;
  return (
    <section id="notas" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="notes-title">
      <Kicker>{content.kicker}</Kicker>
      <h2 id="notes-title" className="mb-0 mt-4 max-w-[22ch] text-h2-fluid uppercase">
        {content.title}
      </h2>
      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
        {tiers.map((t, i) => (
          <div key={t.key} className={cn("border-t-2 pt-7", i === tiers.length - 1 ? "border-accent" : "border-ink")}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="m-0 text-h3 uppercase">{t.text[0]}</h3>
              <span className="text-legal text-ink-3">{t.text[1]}</span>
            </div>
            <ul className="m-0 mt-7 flex list-none flex-col gap-2.5 p-0">
              {t.items.map((n) => (
                <li key={n} className="text-lead text-ink-2">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
