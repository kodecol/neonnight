import type { SiteContent } from "@/application/dto/site-content.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { ROUTES } from "@/presentation/lib/site";

/** 404 con la identidad vigente (isotipo y nombre). `standalone`: fuera del armazón de la tienda. */
export function NotFoundView({ brand, standalone = false }: { brand: SiteContent["brand"]; standalone?: boolean }) {
  return (
    <main className="flex min-h-screen flex-col justify-center px-page pt-header" data-testid="not-found">
      {standalone && (
        <a href={ROUTES.home} className="mb-14 flex w-fit items-center gap-4" aria-label={`${brand.name}, inicio`}>
          <Isotype size={48} asset={brand.isotype} />
          <span className="text-label-lg uppercase tracking-[0.32em]">{brand.wordmark}</span>
        </a>
      )}
      <Kicker>404 · {brand.name}</Kicker>
      <h1 className="mb-4 mt-4 text-display-fluid uppercase">Pieza no encontrada</h1>
      <p className="m-0 max-w-[48ch] text-lead text-ink-2">Esta página no existe o la pieza ya no está en la colección.</p>
      <div className="mt-9">
        <Button href={ROUTES.collection}>Ver la colección</Button>
      </div>
    </main>
  );
}
