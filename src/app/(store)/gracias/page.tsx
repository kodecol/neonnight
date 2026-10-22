import type { Metadata } from "next";
import { GetOrderStatus } from "@/application/use-cases/get-order-status";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { AutoRefresh } from "@/presentation/components/checkout/AutoRefresh";
import { TrackPurchase } from "@/presentation/components/seo/TrackEvent";
import { ROUTES } from "@/presentation/lib/site";
import { container } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Pedido recibido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const COPY = {
  pagada: { kicker: "Pago confirmado", title: "Gracias", body: "Recibimos tu pago. Te escribimos por WhatsApp para coordinar la entrega." },
  pendiente: { kicker: "Pago en verificación", title: "Un momento", body: "Estamos confirmando tu pago con Bold. Esta página se actualiza sola." },
  fallida: { kicker: "Pago rechazado", title: "No se completó", body: "Bold no aprobó el pago y no se hizo ningún cobro. Puedes intentarlo de nuevo o escribirnos para ayudarte." },
  cancelada: { kicker: "Pedido cancelado", title: "Pedido cancelado", body: "Este pedido fue cancelado. Escríbenos si necesitas ayuda." },
} as const;

/**
 * Confirmación del pedido. Bold: muestra el estado que llega por webhook y se
 * refresca mientras está pendiente. Sin pasarela (pedido manual): muestra las
 * instrucciones del panel › Pagos y el botón para coordinar por WhatsApp.
 */
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  const { orders, paymentSettings, whatsapp } = (await container());
  const [order, settings] = await Promise.all([orden ? new GetOrderStatus(orders).execute(orden) : null, paymentSettings.get()]);

  if (!order) {
    return (
      <main className="flex min-h-screen flex-col justify-center px-page pt-header">
        <Kicker>Pedido</Kicker>
        <h1 className="mb-4 mt-4 text-display-fluid uppercase max-md:text-[min(44px,9vw)]">No encontramos el pedido</h1>
        <p className="m-0 max-w-[52ch] text-lead text-ink-2">Revisa el enlace o escríbenos con tu número de pedido.</p>
        <div className="mt-9 flex gap-4">
          <Button href={ROUTES.collection}>Ver la colección</Button>
        </div>
      </main>
    );
  }

  const manual = order.paymentMethod === "manual" && order.status === "pendiente";
  const copy = manual
    ? { kicker: "Pedido recibido", title: "Gracias", body: settings.manual.instructions }
    : COPY[order.status];
  const coordinate = whatsapp.generic(`Hola, hice el pedido ${order.id} por ${order.totalFormatted}. ¿Cómo coordinamos el pago y la entrega?`);

  return (
    <main className="flex min-h-screen flex-col justify-center px-page pt-header" data-testid={`order-${order.status}`}>
      {order.status === "pagada" && (
        <TrackPurchase
          event={{
            name: "purchase",
            orderId: order.id,
            valueCents: order.totalCents,
            items: order.lines.map((l) => ({ id: l.productId, name: l.name, variant: l.variantLabel || undefined, priceCents: l.unitPriceCents, quantity: l.quantity })),
          }}
        />
      )}
      {order.status === "pendiente" && order.paymentMethod === "bold" && <AutoRefresh />}
      <Kicker>{copy.kicker}</Kicker>
      <h1 className="mb-4 mt-4 text-display-fluid uppercase max-md:text-[min(44px,9vw)]">{copy.title}</h1>
      <p className="m-0 text-meta text-ink-2">
        Pedido <span className="text-ink" data-testid="order-id">{order.id}</span> · {order.totalFormatted}
      </p>
      <p className="mb-0 mt-5 max-w-[56ch] text-lead text-ink-2 [text-wrap:pretty]">{copy.body}</p>
      <div className="mt-9 flex flex-wrap gap-4">
        {(manual || order.status === "fallida") && coordinate && (
          <Button href={coordinate} target="_blank" rel="noopener noreferrer" data-testid="order-whatsapp">
            Coordinar por WhatsApp
          </Button>
        )}
        <Button href={ROUTES.collection} variant={manual ? "secondary" : "primary"}>
          Seguir viendo
        </Button>
      </div>
      <p className="mb-0 mt-8 max-w-[56ch] text-legal text-ink-3">Guarda tu número de pedido: es la referencia para cualquier consulta, cambio o garantía.</p>
    </main>
  );
}
