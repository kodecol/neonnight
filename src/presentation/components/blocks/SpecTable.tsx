import type { SpecRowDto } from "@/application/dto/product.dto";
import { Kicker } from "@/presentation/components/primitives/Kicker";

export function SpecTable({ rows, kicker }: { rows: SpecRowDto[]; kicker: string }) {
  if (rows.length === 0) return null;
  return (
    <section id="especificaciones" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="specs-kicker">
      <Kicker as="p" className="m-0">
        <span id="specs-kicker">{kicker}</span>
      </Kicker>
      <dl className="m-0 mt-11 grid grid-cols-1 gap-x-20 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-6 border-b border-divider py-[22px]">
            <dt className="shrink-0 text-meta text-ink-2">{r.label}</dt>
            <dd className="m-0 text-right text-meta font-normal">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
