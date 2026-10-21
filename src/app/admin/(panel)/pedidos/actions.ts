"use server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { DeleteOrders, MarkOrderReviewed, PurgeOrder, RestoreOrder, UpdateOrderStatus } from "@/application/use-cases/admin/orders";
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
