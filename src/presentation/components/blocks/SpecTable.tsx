import type { WatchDetailDto } from "@/application/dto/watch.dto";
import { Kicker } from "@/presentation/components/primitives/Kicker";

export function SpecTable({ specs }: { specs: WatchDetailDto["specs"] }) {
  const rows: Array<[string, string]> = [
    ["Movimiento", specs.movement],
    ["Reserva de marcha", specs.powerReserve],
    ["Caja", specs.case],
    ["Cristal", specs.crystal],
    ["Hermeticidad", specs.waterResistance],
    ["Incluye", specs.includes],
  ];
  return (
    <section id="especificaciones" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="specs-kicker">
      <Kicker as="p" className="m-0">
        <span id="specs-kicker">Especificaciones</span>
      </Kicker>
      <dl className="m-0 mt-11 grid grid-cols-1 gap-x-20 md:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 border-b border-divider py-[22px]">
            <dt className="text-meta text-ink-2">{k}</dt>
            <dd className="m-0 text-right text-meta font-normal">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
