import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetOrderStatus } from "@/application/use-cases/get-order-status";
import { isPaymentReady } from "@/application/ports/payment-settings";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { ROUTES } from "@/presentation/lib/site";
import { TrackPurchase } from "@/presentation/components/seo/TrackEvent";

export const metadata: Metadata = { title: "Pedido recibido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const COPY = {
  pagada: { kicker: "Pago confirmado", body: "Recibimos tu pago. Te contactamos para coordinar la entrega de la pieza." },
  pendiente: { kicker: "Pago en verificación", body: "Estamos confirmando tu pago con la pasarela. Te avisamos apenas quede aprobado." },
  fallida: { kicker: "Pago rechazado", body: "La pasarela no aprobó el pago. Puedes intentarlo de nuevo o escribirnos para ayudarte." },
  cancelada: { kicker: "Pedido cancelado", body: "Este pedido fue cancelado. Escríbenos si necesitas ayuda." },
} as const;

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  const { orders, paymentSettings } = getContainer();
  const [order, settings] = await Promise.all([orden ? new GetOrderStatus(orders).execute(orden) : null, paymentSettings.get()]);
  const gatewayOn = isPaymentReady(settings);

  const copy = order && gatewayOn ? COPY[order.status] : null;
  return (
    <main className="flex min-h-screen flex-col justify-center px-page pt-header">
      {order && gatewayOn && order.status === "pagada" && (
        <TrackPurchase
          event={{
            name: "purchase",
            orderId: order.id,
            valueCents: order.totalCents,
            items: order.lines.map((l) => ({ id: l.productId, name: l.name, variant: l.variantLabel || undefined, priceCents: l.unitPriceCents, quantity: l.quantity })),
          }}
        />
      )}
      <Kicker>{copy?.kicker ?? "Pedido recibido"}</Kicker>
      <h1 className="mb-4 mt-4 text-display-fluid uppercase">Gracias</h1>
      <p className="m-0 max-w-[52ch] text-lead text-ink-2 [text-wrap:pretty]">
        {copy ? (
          <>
            Pedido <span className="text-ink">{order?.id}</span> · {order?.totalFormatted}. {copy.body}
          </>
        ) : (
          <>
            Tu pedido {orden ? <span className="text-ink">{orden}</span> : null} quedó registrado. Verificamos la pieza y te contactamos para coordinar el pago y la entrega.
          </>
        )}
      </p>
      {!gatewayOn && <p className="mb-0 mt-3 max-w-[52ch] text-legal text-ink-3">La pasarela de pago aún no está activa: este pedido no generó cobro.</p>}
      <div className="mt-9 flex gap-4">
        <Button href={ROUTES.collection}>Seguir viendo</Button>
        <Button href={ROUTES.home} variant="secondary">
          Inicio
        </Button>
      </div>
    </main>
  );
}
