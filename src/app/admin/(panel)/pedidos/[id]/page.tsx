import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { GetAdminOrder } from "@/application/use-cases/admin/orders";
import { DOCUMENT_LABEL } from "@/application/dto/checkout.dto";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { OrderActions } from "@/presentation/components/admin/OrderActions";
import { Button } from "@/presentation/components/primitives/Button";
import { updateOrderStatusAction } from "../actions";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short", timeZone: "America/Bogota" });

function Facts({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="m-0 grid border-t border-divider sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1 border-b border-divider py-3.5 sm:pr-6">
          <dt className="text-label-sm uppercase text-ink-3">{k}</dt>
          <dd className="m-0 text-small text-ink [overflow-wrap:anywhere]">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await new GetAdminOrder(getContainer().orders).execute(id);
  if (!o) notFound();
  const c = o.customerDetail;
  return (
    <>
      <AdminPageHeader
        kicker={`Pedido · ${o.statusLabel}`}
        title={o.id}
        actions={
          <Button href="/admin/pedidos" variant="ghost" size="sm">
            ← Pedidos
          </Button>
        }
      />
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-12">
          <section>
            <h2 className="mb-5 mt-0 text-label-lg uppercase">Piezas</h2>
            <ul className="m-0 flex list-none flex-col border-t border-divider p-0" data-testid="order-lines">
              {o.lines.map((l) => (
                <li key={`${l.slug}-${l.variantLabel}`} className="flex justify-between gap-4 border-b border-divider py-4 text-small">
                  <span>
                    <span className="font-medium uppercase">{l.name}</span>
                    <span className="block text-legal text-ink-2">{[l.variantLabel, `${l.quantity} × ${l.unitPrice}`].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="tabular-nums">{l.lineTotal}</span>
                </li>
              ))}
            </ul>
            <dl className="m-0 mt-4 flex flex-col items-end gap-1.5 text-small">
              <div className="flex gap-6">
                <dt className="text-ink-2">Subtotal</dt>
                <dd className="m-0 tabular-nums">{o.subtotal}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-ink-2">Envío</dt>
                <dd className="m-0">{o.shipping}</dd>
              </div>
              <div className="flex gap-6 text-meta">
                <dt>Total</dt>
                <dd className="m-0 font-medium tabular-nums">{o.total}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2 className="mb-5 mt-0 text-label-lg uppercase">Cliente y entrega</h2>
            {c ? (
              <Facts
                items={[
                  ["Nombre", c.name],
                  ["Documento", `${DOCUMENT_LABEL[c.documentType]} ${c.documentNumber}`],
                  ["Correo", <a key="m" href={`mailto:${c.email}`} className="underline decoration-accent underline-offset-4">{c.email}</a>],
                  ["Celular", c.phone],
                  ["Dirección", c.address],
                  ["Ciudad", `${c.city}, ${c.department}`],
                  ["Notas", c.notes],
                ]}
              />
            ) : (
              <p className="m-0 text-small text-ink-3">Pedido anterior al checkout con datos: sin información del cliente.</p>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-8 self-start">
          <OrderActions id={o.id} canMarkPaid={o.canMarkPaid} canCancel={o.canCancel} update={updateOrderStatusAction} />
          <Facts
            items={[
              ["Fecha", fmt(o.createdAt)],
              ["Pago", o.paymentMethod === "bold" ? "Bold (en línea)" : "Manual (sin pasarela)"],
              ["Referencia de pago", o.paymentReference],
              ["Términos aceptados", o.consent ? `Versión ${o.consent.termsVersion}` : null],
              ["Privacidad aceptada", o.consent ? `Versión ${o.consent.privacyVersion}` : null],
              ["Aceptó el", o.consent ? fmt(o.consent.acceptedAt) : null],
            ]}
          />
        </aside>
      </div>
    </>
  );
}
