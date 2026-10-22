"use server";
import { revalidatePath } from "next/cache";
import { parseSaveMode } from "@/application/lib/save-mode";
import { DiscardAppearanceDraft, SaveAppearance } from "@/application/use-cases/admin/appearance";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { StoreAppearanceInput } from "@/application/dto/appearance.dto";
import { requireAdmin } from "../../../_lib/auth";
import { toActionError } from "../../../_lib/result";
import { container } from "@/app/_lib/tenant";

/** `draft`: borrador para la vista previa (la tienda no cambia). `publish`: a la tienda. */
export async function saveAppearanceAction(input: StoreAppearanceInput, mode: "draft" | "publish"): Promise<ActionResult> {
  await requireAdmin();
  try {
    // Llega del cliente: sin un modo válido no se guarda (ni se publica por descarte).
    const target = parseSaveMode(mode);
    await new SaveAppearance((await container())).execute(input, target);
    if (target === "publish") revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "appearance");
  }
}

export async function discardAppearanceDraftAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new DiscardAppearanceDraft((await container()).appearance).execute();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "appearance-draft");
  }
}
