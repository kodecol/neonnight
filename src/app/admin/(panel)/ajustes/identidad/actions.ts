"use server";
import { revalidatePath } from "next/cache";
import { parseSaveMode } from "@/application/lib/save-mode";
import { DiscardIdentityDraft, SaveIdentity, UploadIdentityAsset } from "@/application/use-cases/admin/identity";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { StoreIdentityInput } from "@/application/dto/identity.dto";
import { requireAdmin } from "../../../_lib/auth";
import { toActionError } from "../../../_lib/result";
import { container } from "@/app/_lib/tenant";

/** `draft`: borrador para la vista previa (la tienda no cambia). `publish`: a la tienda. */
export async function saveIdentityAction(input: StoreIdentityInput, mode: "draft" | "publish"): Promise<ActionResult> {
  await requireAdmin();
  try {
    // Llega del cliente: sin un modo válido no se guarda (ni se publica por descarte).
    const target = parseSaveMode(mode);
    await new SaveIdentity((await container())).execute(input, target);
    if (target === "publish") revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "identity");
  }
}

export async function discardIdentityDraftAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new DiscardIdentityDraft((await container()).identity).execute();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "identity-draft");
  }
}

export async function uploadIdentityAssetAction(fd: FormData): Promise<ActionResult<{ src: string; ratio: number }>> {
  await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "No llegó ningún archivo." };
  try {
    const data = await new UploadIdentityAsset((await container()).identityUploader).execute({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      filename: "name" in file && typeof file.name === "string" ? file.name : "identidad",
      width: Number(fd.get("width")),
      height: Number(fd.get("height")),
    });
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "identity-upload");
  }
}
