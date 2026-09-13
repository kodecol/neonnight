import type { Metadata } from "next";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { ROUTES } from "@/presentation/lib/site";

export const metadata: Metadata = { title: "Pedido recibido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col justify-center px-page pt-header">
      <Kicker>Pedido recibido</Kicker>
      <h1 className="mb-4 mt-4 text-display-fluid uppercase">Gracias</h1>
      <p className="m-0 max-w-[52ch] text-lead text-ink-2 [text-wrap:pretty]">
        Tu pedido {orden ? <span className="text-ink">{orden}</span> : null} quedó registrado. Verificamos la pieza y te contactamos para coordinar el pago y la entrega.
      </p>
      <p className="mb-0 mt-3 max-w-[52ch] text-legal text-ink-3">La pasarela de pago aún no está conectada: este flujo usa el adaptador de prueba.</p>
      <div className="mt-9 flex gap-4">
        <Button href={ROUTES.collection}>Seguir viendo</Button>
        <Button href={ROUTES.home} variant="secondary">
          Inicio
        </Button>
      </div>
    </main>
  );
}
