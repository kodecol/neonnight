"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { deleteOrdersQuestion, purgeOrderQuestion } from "@/presentation/lib/order-confirm";

/**
 * Acciones de un pedido. Pendiente: verificar con Bold (pedidos de Bold),
 * marcar pagado (descuenta stock), cancelar o eliminar (va a Eliminados). En Eliminados: restaurar o
 * purgar definitivamente.
 */
export function OrderActions({
  id,
  bold,
  canMarkPaid,
  canVerifyPayment,
  canCancel,
  canDelete,
  canRestore,
  linkMayBeLive,
  update,
  verify,
  remove,
  restore,
  purge,
}: {
  id: string;
  bold: boolean;
  canMarkPaid: boolean;
  canVerifyPayment: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canRestore: boolean;
  linkMayBeLive: boolean;
  update: (id: string, next: "pagada" | "cancelada") => Promise<ActionResult<{ short: string[] }>>;
  verify: (id: string) => Promise<ActionResult<{ message: string }>>;
  remove: (ids: string[]) => Promise<ActionResult<{ deleted: string[] }>>;
  restore: (id: string) => Promise<ActionResult>;
  purge: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!canMarkPaid && !canVerifyPayment && !canCancel && !canDelete && !canRestore) return null;

  const run = (next: "pagada" | "cancelada", question: string) => {
    if (!window.confirm(question)) return;
    start(async () => {
      const res = await update(id, next);
      if (!res.ok) return setMessage(res.error);
      setMessage(res.data.short.length ? `Ojo: sin stock suficiente en ${res.data.short.join(", ")}. Revísalo en el catálogo.` : null);
      router.refresh();
    });
  };

  const check = () =>
    start(async () => {
      const res = await verify(id);
      setMessage(res.ok ? res.data.message : res.error);
      router.refresh();
    });

  const act = (question: string, action: () => Promise<ActionResult<unknown>>, after: () => void) => {
    if (!window.confirm(question)) return;
    start(async () => {
      const res = await action();
      if (!res.ok) return setMessage(res.error);
      setMessage(null);
      after();
    });
  };

  return (
    <div className="flex flex-col gap-3 border border-divider p-5" data-testid="order-actions">
      {canVerifyPayment && (
        <Button onClick={check} disabled={pending} className="justify-center" data-testid="order-verify-payment">
          Verificar pago con Bold
        </Button>
      )}
      {canMarkPaid && (
        <Button
          variant={bold ? "secondary" : "primary"}
          onClick={() =>
            run(
              "pagada",
              bold
                ? "¿Confirmas que el pago aparece APROBADO en tu panel de Bold? Úsalo solo si «Verificar pago con Bold» no lo confirma. Se descuenta el stock de las piezas."
                : "¿Confirmas que recibiste el pago? Se descuenta el stock de las piezas.",
            )
          }
          disabled={pending}
          className="justify-center"
          data-testid="order-mark-paid"
        >
          {bold ? "Marcar pagado a mano" : "Marcar como pagado"}
        </Button>
      )}
      {canCancel && (
        <Button variant="secondary" onClick={() => run("cancelada", "¿Cancelar este pedido? No se puede deshacer.")} disabled={pending} className="justify-center" data-testid="order-cancel">
          Cancelar pedido
        </Button>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          onClick={() => act(deleteOrdersQuestion([{ id, linkMayBeLive }]), () => remove([id]), () => router.refresh())}
          disabled={pending}
          className="justify-center"
          data-testid="order-delete"
        >
          Eliminar pedido
        </Button>
      )}
      {canDelete && linkMayBeLive && (
        <p className="m-0 text-legal text-ink-2" data-testid="order-link-live">
          El link de pago de Bold puede seguir vigente (se creó hace menos de 30 minutos).
        </p>
      )}
      {canRestore && (
        <Button variant="secondary" onClick={() => act(`¿Restaurar el pedido ${id}? Vuelve a la lista tal como estaba.`, () => restore(id), () => router.refresh())} disabled={pending} className="justify-center" data-testid="order-restore">
          Restaurar
        </Button>
      )}
      {canRestore && (
        <Button variant="ghost" onClick={() => act(purgeOrderQuestion(id), () => purge(id), () => router.push("/admin/pedidos?vista=eliminados"))} disabled={pending} className="justify-center" data-testid="order-purge">
          Purgar definitivamente
        </Button>
      )}
      {message && (
        <p role="alert" className="m-0 text-legal text-accent">
          {message}
        </p>
      )}
    </div>
  );
}

/** Aviso destacado de un pedido marcado para revisar (p. ej. pago recibido estando eliminado). */
export function OrderReviewNotice({ id, review, markReviewed }: { id: string; review: string; markReviewed: (id: string) => Promise<ActionResult> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-accent bg-surface p-5 shadow-[inset_3px_0_0_var(--color-accent)]" role="status" data-testid="order-review">
      <div>
        <span className="block text-label-sm uppercase text-accent">Revisar</span>
        <p className="m-0 mt-1.5 text-small text-ink">{review}</p>
        {error && (
          <p role="alert" className="m-0 mt-2 text-legal text-accent">
            {error}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await markReviewed(id);
            if (!res.ok) return setError(res.error);
            router.refresh();
          })
        }
        data-testid="order-mark-reviewed"
      >
        Marcar revisado
      </Button>
    </div>
  );
}
