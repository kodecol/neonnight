"use server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { DeleteOrders, MarkOrderReviewed, PurgeOrder, RestoreOrder, UpdateOrderStatus } from "@/application/use-cases/admin/orders";
import { ReconcilePayment } from "@/application/use-cases/confirm-payment";
import type { ActionResult } from "@/application/dto/admin.dto";
import { requireAdmin } from "../../_lib/auth";
import { toActionError } from "../../_lib/result";

/** Lista y detalle de pedidos (las páginas son dinámicas; esto vacía la caché del router). */
const revalidateOrders = () => revalidatePath("/admin/pedidos", "layout");

export async function updateOrderStatusAction(id: string, next: "pagada" | "cancelada"): Promise<ActionResult<{ short: string[] }>> {
  await requireAdmin();
  try {
    const data = await new UpdateOrderStatus(getContainer()).execute(id, next);
    // Pagar descuenta stock: la tienda cambia.
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "order-status");
  }
}

/** Le pregunta a Bold por el pago de un pedido pendiente y aplica lo que responda. */
export async function verifyBoldPaymentAction(id: string): Promise<ActionResult<{ message: string }>> {
  await requireAdmin();
  try {
    const r = await new ReconcilePayment(getContainer()).execute(String(id));
    if (!r.handled) return { ok: false, error: r.reason === "Bold no respondió" ? "Bold no respondió. Revisa las llaves en Ajustes › Pagos o inténtalo en un momento." : `No se pudo verificar: ${r.reason}.` };
    if (r.status === "pagada") revalidatePath("/", "layout");
    else revalidateOrders();
    const message = r.gateway === "pagada" || r.status === "pagada" ? "Bold confirma el pago: el pedido quedó pagado." : r.gateway === "fallida" ? "Bold reporta el pago rechazado." : "Bold todavía no registra el pago de este link.";
    return { ok: true, data: { message } };
  } catch (e) {
    return toActionError(e, "order-verify");
  }
}

/** Mueve pedidos pendientes a Eliminados (uno o varios). */
export async function deleteOrdersAction(ids: string[]): Promise<ActionResult<{ deleted: string[] }>> {
  await requireAdmin();
  try {
    const data = await new DeleteOrders(getContainer()).execute(ids);
    revalidateOrders();
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "order-delete");
  }
}

export async function restoreOrderAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new RestoreOrder(getContainer()).execute(id);
    revalidateOrders();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "order-restore");
  }
}

export async function purgeOrderAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new PurgeOrder(getContainer().orders).execute(id);
    revalidateOrders();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "order-purge");
  }
}

export async function markOrderReviewedAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new MarkOrderReviewed(getContainer()).execute(id);
    revalidateOrders();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "order-review");
  }
}
