import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { ListAdminOrders, ORDER_STATUS_LABEL } from "@/application/use-cases/admin/orders";
import type { OrderStatus } from "@/domain/entities/order";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { cn } from "@/presentation/lib/cn";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const TABS: Array<{ value: OrderStatus | null; label: string }> = [
  { value: null, label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "pagada", label: "Pagados" },
  { value: "cancelada", label: "Cancelados" },
  { value: "fallida", label: "Rechazados" },
];

const fmt = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const status = TABS.find((t) => t.value === estado)?.value ?? null;
  const rows = await new ListAdminOrders(getContainer().orders).execute(status ?? undefined);
  return (
    <>
      <AdminPageHeader kicker="Ventas" title="Pedidos" />
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/admin/pedidos?estado=${t.value}` : "/admin/pedidos"}
            aria-current={t.value === status ? "page" : undefined}
            className={cn("border px-4 py-2.5 text-label-sm uppercase transition-colors", t.value === status ? "border-ink bg-ink text-bg" : "border-border text-ink-2 hover:border-ink hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="m-0 text-small text-ink-3">{status ? `No hay pedidos ${ORDER_STATUS_LABEL[status].toLowerCase()}s.` : "Todavía no hay pedidos."}</p>
      ) : (
        <div className="overflow-x-auto border border-divider">
          <table className="w-full min-w-[760px] border-collapse text-left" data-testid="orders-table">
            <thead>
              <tr className="border-b border-divider text-label-sm uppercase text-ink-3">
                <th className="px-5 py-3.5 font-semibold">Pedido</th>
                <th className="px-5 py-3.5 font-semibold">Fecha</th>
                <th className="px-5 py-3.5 font-semibold">Cliente</th>
                <th className="px-5 py-3.5 font-semibold">Pago</th>
                <th className="px-5 py-3.5 font-semibold">Estado</th>
                <th className="px-5 py-3.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-divider text-small last:border-b-0 hover:bg-surface">
                  <td className="px-5 py-4">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-ink hover:text-accent">
                      {o.id}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-ink-2">{fmt(o.createdAt)}</td>
                  <td className="px-5 py-4 text-ink-2">
                    {o.customer ?? "—"}
                    {o.city && <span className="block text-legal text-ink-3">{o.city}</span>}
                  </td>
                  <td className="px-5 py-4 text-ink-2">{o.paymentMethod === "bold" ? "Bold" : "Manual"}</td>
                  <td className="px-5 py-4">
                    <span className={cn("border px-2 py-1 text-label-sm uppercase", o.status === "pagada" ? "border-ink text-ink" : o.status === "pendiente" ? "border-accent text-accent" : "border-border text-ink-3")}>
                      {o.statusLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
