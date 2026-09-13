import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { ROUTES } from "@/presentation/lib/site";

export function CatalogHeader({ total }: { total: number }) {
  return (
    <section id="catalogo" className="border-b border-divider px-page pb-10 pt-section" data-reveal="1">
      <div className="flex flex-wrap items-end justify-between gap-10">
        <div>
          <Kicker>Catálogo</Kicker>
          <h2 className="mb-0 mt-4 max-w-[16ch] text-h2-fluid uppercase">Vendemos relojes de marcas que conoces, a precios que no conocías</h2>
        </div>
        <Button href={ROUTES.collection} variant="link">
          Ver las {total} referencias
        </Button>
      </div>
    </section>
  );
}
