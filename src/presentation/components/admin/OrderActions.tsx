"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import { Button } from "@/presentation/components/primitives/Button";

/** Acciones de un pedido pendiente: marcar pagado (solo manuales; descuenta stock) o cancelar. */
export function OrderActions({
  id,
  canMarkPaid,
  canCancel,
  update,
}: {
  id: string;
  canMarkPaid: boolean;
  canCancel: boolean;
  update: (id: string, next: "pagada" | "cancelada") => Promise<ActionResult<{ short: string[] }>>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!canMarkPaid && !canCancel) return null;

  const run = (next: "pagada" | "cancelada", question: string) => {
    if (!window.confirm(question)) return;
    start(async () => {
      const res = await update(id, next);
      if (!res.ok) return setMessage(res.error);
      setMessage(res.data.short.length ? `Ojo: sin stock suficiente en ${res.data.short.join(", ")}. Revísalo en el catálogo.` : null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 border border-divider p-5" data-testid="order-actions">
      {canMarkPaid && (
        <Button onClick={() => run("pagada", "¿Confirmas que recibiste el pago? Se descuenta el stock de las piezas.")} disabled={pending} className="justify-center" data-testid="order-mark-paid">
          Marcar como pagado
        </Button>
      )}
      {canCancel && (
        <Button variant="secondary" onClick={() => run("cancelada", "¿Cancelar este pedido? No se puede deshacer.")} disabled={pending} className="justify-center" data-testid="order-cancel">
          Cancelar pedido
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
