"use server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { UpdateOrderStatus } from "@/application/use-cases/admin/orders";
import type { ActionResult } from "@/application/dto/admin.dto";
import { requireAdmin } from "../../_lib/auth";
import { toActionError } from "../../_lib/result";

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
