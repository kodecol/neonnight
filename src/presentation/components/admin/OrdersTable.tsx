"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { AdminOrderRowDto } from "@/application/use-cases/admin/orders";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { deleteOrdersQuestion, purgeOrderQuestion } from "@/presentation/lib/order-confirm";

const checkbox = "h-4 w-4 cursor-pointer accent-[#ff006e] disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Tabla de pedidos. En la lista normal, casillas para eliminar varios a la vez
 * (solo los pendientes se pueden marcar); en Eliminados, Restaurar y Purgar por
 * fila. Los pedidos marcados para revisar se destacan con el magenta.
 */
export function OrdersTable({
  rows,
  trash,
  remove,
  restore,
  purge,
}: {
  rows: AdminOrderRowDto[];
  trash: boolean;
  remove: (ids: string[]) => Promise<ActionResult<{ deleted: string[] }>>;
  restore: (id: string) => Promise<ActionResult>;
  purge: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const deletable = rows.filter((r) => r.canDelete);
  // Solo cuenta lo que sigue en la página (tras eliminar o cambiar de filtro).
  const chosen = deletable.filter((r) => selected.has(r.id));
  const allChosen = deletable.length > 0 && chosen.length === deletable.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (question: string, action: () => Promise<ActionResult<unknown>>, done?: () => void) => {
    if (!window.confirm(question)) return;
    start(async () => {
      const res = await action();
      if (!res.ok) return setMessage(res.error);
      setMessage(null);
      done?.();
      router.refresh();
    });
  };

  const removeChosen = () =>
    run(
      deleteOrdersQuestion(chosen),
      () => remove(chosen.map((r) => r.id)),
      () => setSelected(new Set()),
    );

  return (
    <div className="flex flex-col gap-4">
      {!trash && (
        <div className="flex min-h-12 flex-wrap items-center gap-4" data-testid="orders-bulk">
          <span className="text-label-sm uppercase text-ink-2">{chosen.length ? `${chosen.length} seleccionado${chosen.length === 1 ? "" : "s"}` : "Marca pedidos pendientes para eliminarlos"}</span>
          {chosen.length > 0 && (
            <>
              <Button size="sm" variant="secondary" onClick={removeChosen} disabled={pending} data-testid="orders-delete-selected">
                Eliminar seleccionados
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={pending}>
                Quitar selección
              </Button>
            </>
          )}
        </div>
      )}
      {message && (
        <p role="alert" className="m-0 text-legal text-accent">
          {message}
        </p>
      )}
      {/* relative: el sr-only de "Acciones" es absoluto y, sin esto, se sale del scroll y ensancha la página. */}
      <div className="relative overflow-x-auto border border-divider">
        <table className={cn("w-full border-collapse text-left", trash ? "min-w-[960px]" : "min-w-[860px]")} data-testid="orders-table">
          <thead>
            <tr className="border-b border-divider text-label-sm uppercase text-ink-3">
              {!trash && (
                <th className="w-12 py-3.5 pl-5 font-semibold">
                  <input
                    type="checkbox"
                    aria-label="Marcar todos los pendientes de esta página"
                    className={checkbox}
                    checked={allChosen}
                    disabled={deletable.length === 0 || pending}
                    onChange={() => setSelected(allChosen ? new Set() : new Set(deletable.map((r) => r.id)))}
                  />
                </th>
              )}
              <th className="px-5 py-3.5 font-semibold">Pedido</th>
              <th className="px-5 py-3.5 font-semibold">Fecha</th>
              <th className="px-5 py-3.5 font-semibold">Cliente</th>
              <th className="px-5 py-3.5 font-semibold">Pago</th>
              <th className="px-5 py-3.5 font-semibold">Estado</th>
              <th className="px-5 py-3.5 text-right font-semibold">Total</th>
              {trash && <th className="px-5 py-3.5 font-semibold">Eliminado</th>}
              {trash && (
                <th className="px-5 py-3.5 font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                data-testid="order-row"
                data-order={o.id}
                className={cn("border-b border-divider text-small last:border-b-0 hover:bg-surface", o.review && "bg-surface shadow-[inset_3px_0_0_var(--color-accent)]")}
              >
                {!trash && (
                  <td className="py-4 pl-5">
                    <input
                      type="checkbox"
                      aria-label={`Marcar ${o.id}`}
                      className={checkbox}
                      checked={selected.has(o.id)}
                      disabled={!o.canDelete || pending}
                      title={o.canDelete ? undefined : "Solo se eliminan pedidos pendientes"}
                      onChange={() => toggle(o.id)}
                    />
                  </td>
                )}
                <td className="px-5 py-4">
                  <Link href={`/admin/pedidos/${o.id}`} className="whitespace-nowrap font-medium text-ink hover:text-accent">
                    {o.id}
                  </Link>
                  {o.review && (
                    <span className="mt-1.5 block w-fit bg-accent px-2 py-0.5 text-label-sm uppercase text-ink" title={o.review} data-testid="order-review-badge">
                      Revisar
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-ink-2">{o.labels.createdAt}</td>
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
                <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">{o.total}</td>
                {trash && (
                  <td className="px-5 py-4 text-ink-2">
                    {o.labels.deletedAt}
                    <span className="block text-legal text-ink-3">Se purga el {o.labels.purgeAt}</span>
                  </td>
                )}
                {trash && (
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-stretch gap-2">
                      <Button size="sm" variant="secondary" className="justify-center" disabled={pending} onClick={() => run(`¿Restaurar el pedido ${o.id}? Vuelve a la lista tal como estaba.`, () => restore(o.id))} data-testid="order-restore">
                        Restaurar
                      </Button>
                      <Button size="sm" variant="ghost" className="justify-center" disabled={pending} onClick={() => run(purgeOrderQuestion(o.id), () => purge(o.id))} data-testid="order-purge">
                        Purgar
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
