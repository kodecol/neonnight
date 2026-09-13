import type { WatchDetailDto } from "@/application/dto/watch.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { AddToCartButton } from "./AddToCartButton";

const LABEL: Record<WatchDetailDto["availability"], string> = { disponible: "Disponible", reservado: "Reservado", vendido: "Vendido" };

export function ClosingCta({ watch, whatsappUrl }: { watch: WatchDetailDto; whatsappUrl: string | null }) {
  return (
    <section id="compra" className="grid grid-cols-1 items-end gap-10 px-page py-section md:grid-cols-[1fr_auto] md:gap-[60px]" data-reveal="1">
      <div>
        <Kicker>{LABEL[watch.availability]}</Kicker>
        <h2 className="mb-3 mt-4 text-h2-fluid uppercase">{watch.name}</h2>
        <span className="text-lead text-ink">{watch.price.formatted}</span>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <AddToCartButton watch={watch} size="lg" />
        {whatsappUrl ? (
          <Button href={whatsappUrl} variant="secondary" size="lg" target="_blank" rel="noopener noreferrer" data-testid="whatsapp-cta">
            Hablar por WhatsApp
          </Button>
        ) : (
          <Button variant="secondary" size="lg" disabled title="Número de WhatsApp pendiente">
            Hablar por WhatsApp
          </Button>
        )}
      </div>
    </section>
  );
}
