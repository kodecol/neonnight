import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { ListAdminOrders, ORDER_STATUS_LABEL, orderFiltersQuery, parseAdminOrderFilters, type AdminOrderFilters } from "@/application/use-cases/admin/orders";
import { ORDER_TRASH_DAYS, type OrderStatus } from "@/domain/entities/order";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { OrdersTable } from "@/presentation/components/admin/OrdersTable";
import { TextInput } from "@/presentation/components/admin/fields";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { deleteOrdersAction, purgeOrderAction, restoreOrderAction } from "./actions";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const TABS: Array<{ value: OrderStatus | null; label: string }> = [
  { value: null, label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "pagada", label: "Pagados" },
  { value: "cancelada", label: "Cancelados" },
  { value: "fallida", label: "Rechazados" },
];

const tab = (active: boolean) =>
  cn("border px-4 py-2.5 text-label-sm uppercase transition-colors", active ? "border-ink bg-ink text-bg" : "border-border text-ink-2 hover:border-ink hover:text-ink");

/** Descripción de lo que no encontró la lista, según los filtros. */
function emptyText(f: AdminOrderFilters): string {
  if (f.q || f.from || f.to || f.review) return "Ningún pedido coincide con los filtros.";
  if (f.trash) return `Eliminados está vacío. Los pedidos eliminados esperan aquí ${ORDER_TRASH_DAYS} días antes de purgarse.`;
  return f.status ? `No hay pedidos ${ORDER_STATUS_LABEL[f.status].toLowerCase()}s.` : "Todavía no hay pedidos.";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseAdminOrderFilters(await searchParams);
  const list = await new ListAdminOrders(getContainer()).execute(f);
  // Las pestañas conservan la búsqueda y las fechas; vuelven a la página 1.
  const href = (over: Partial<AdminOrderFilters>) => `/admin/pedidos${orderFiltersQuery({ ...f, page: 1, review: false, ...over })}`;
  const csv = `/admin/pedidos/exportar${orderFiltersQuery({ ...f, page: 1 })}`;
  return (
    <>
      <AdminPageHeader
        kicker="Ventas"
        title="Pedidos"
        actions={
          // <a> y no Link: es un archivo (route handler), no una página.
          <a
            href={csv}
            download
            className="inline-flex items-center gap-2 border border-border px-4 py-3.5 text-label-sm font-semibold uppercase text-ink-2 transition-colors duration-300 hover:border-ink hover:text-ink"
            data-testid="orders-csv"
          >
            Descargar CSV
          </a>
        }
      />

      {list.reviewCount > 0 && !f.review && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-accent bg-surface p-5 shadow-[inset_3px_0_0_var(--color-accent)]" role="status" data-testid="orders-review-banner">
          <p className="m-0 text-small text-ink">
            {list.reviewCount === 1 ? "Hay 1 pedido marcado para revisar" : `Hay ${list.reviewCount} pedidos marcados para revisar`} (p. ej. un pago que llegó a un pedido eliminado).
          </p>
          <Button href={href({ trash: false, status: null, review: true, q: "", from: null, to: null })} size="sm" variant="secondary">
            Ver
          </Button>
        </div>
      )}

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {TABS.map((t) => (
          <Link key={t.label} href={href({ trash: false, status: t.value })} aria-current={!f.trash && !f.review && t.value === f.status ? "page" : undefined} className={tab(!f.trash && !f.review && t.value === f.status)}>
            {t.label}
          </Link>
        ))}
        <Link href={href({ trash: true, status: null })} aria-current={f.trash ? "page" : undefined} className={cn(tab(f.trash), "sm:ml-4")} data-testid="orders-trash-tab">
          Eliminados{list.trashCount ? ` (${list.trashCount})` : ""}
        </Link>
      </nav>

      <form method="get" action="/admin/pedidos" className="mb-8 grid items-end gap-5 border-y border-divider py-6 md:grid-cols-[minmax(0,1fr)_170px_170px_auto]" role="search" data-testid="orders-filters">
        {f.trash && <input type="hidden" name="vista" value="eliminados" />}
        {f.status && <input type="hidden" name="estado" value={f.status} />}
        {f.review && <input type="hidden" name="revisar" value="1" />}
        <TextInput label="Buscar" name="q" type="search" defaultValue={f.q} placeholder="Pedido, nombre, correo o celular" maxLength={80} />
        <TextInput label="Desde" name="desde" type="date" defaultValue={f.from ?? ""} />
        <TextInput label="Hasta" name="hasta" type="date" defaultValue={f.to ?? ""} />
        <div className="flex gap-2">
          <Button type="submit" data-testid="orders-filter-submit">
            Filtrar
          </Button>
          {(f.q || f.from || f.to) && (
            <Button href={href({ q: "", from: null, to: null, review: f.review })} variant="ghost">
              Limpiar
            </Button>
          )}
        </div>
      </form>

      {f.trash && (
        <p className="m-0 mb-6 text-small text-ink-2">
          Pedidos pendientes eliminados. Se purgan solos a los {ORDER_TRASH_DAYS} días; antes puedes restaurarlos o purgarlos. Si llega el pago de uno, vuelve solo a la lista y queda marcado para revisar.
        </p>
      )}
      {f.review && (
        <p className="m-0 mb-6 text-small text-ink-2">
          Solo pedidos marcados para revisar.{" "}
          <Link href={href({})} className="text-ink underline decoration-accent underline-offset-4">
            Ver todos
          </Link>
        </p>
      )}

      {list.rows.length === 0 ? (
        <p className="m-0 text-small text-ink-3">{emptyText(f)}</p>
      ) : (
        <>
          <OrdersTable rows={list.rows} trash={f.trash} remove={deleteOrdersAction} restore={restoreOrderAction} purge={purgeOrderAction} />
          <nav className="mt-6 flex flex-wrap items-center justify-between gap-4" aria-label="Páginas" data-testid="orders-pagination">
            <span className="text-label-sm uppercase text-ink-3">
              {list.total} {list.total === 1 ? "pedido" : "pedidos"} · Página {list.page} de {list.pages}
            </span>
            {list.pages > 1 && (
              <div className="flex gap-2">
                {list.page > 1 && (
                  <Button href={`/admin/pedidos${orderFiltersQuery({ ...f, page: list.page - 1 })}`} size="sm" variant="ghost" rel="prev">
                    ← Anterior
                  </Button>
                )}
                {list.page < list.pages && (
                  <Button href={`/admin/pedidos${orderFiltersQuery({ ...f, page: list.page + 1 })}`} size="sm" variant="ghost" rel="next">
                    Siguiente →
                  </Button>
                )}
              </div>
            )}
          </nav>
        </>
      )}
    </>
  );
}
