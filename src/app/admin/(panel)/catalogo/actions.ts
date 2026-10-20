"use server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { SaveWatch } from "@/application/use-cases/admin/save-watch";
import { DeleteWatch } from "@/application/use-cases/admin/delete-watch";
import { DeleteCategory, SaveCategory } from "@/application/use-cases/admin/categories";
import { UploadImage } from "@/application/use-cases/admin/upload-image";
import type { ActionResult, AdminWatchInput, CategoryInput } from "@/application/dto/admin.dto";
import type { StoredMedia } from "@/application/ports/media-uploader";
import { requireAdmin } from "../../_lib/auth";
import { toActionError } from "../../_lib/result";

/** La tienda se renderiza por petición; esto limpia además cualquier caché de cliente/servidor. */
const publish = () => revalidatePath("/", "layout");

export async function saveWatchAction(input: AdminWatchInput): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();
  try {
    const data = await new SaveWatch(getContainer()).execute(input);
    publish();
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "save-watch");
  }
}

export async function deleteWatchAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new DeleteWatch(getContainer().watches).execute(id);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "delete-watch");
  }
}

export async function uploadImageAction(fd: FormData): Promise<ActionResult<StoredMedia>> {
  await requireAdmin();
  const file = fd.get("file");
  // Se valida por Blob (File hereda de Blob): no depende de cómo el runtime reconstruya el archivo.
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "No llegó ningún archivo." };
  try {
    const data = await new UploadImage(getContainer().media).execute({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      filename: "name" in file && typeof file.name === "string" ? file.name : "foto",
      width: Number(fd.get("width")),
      height: Number(fd.get("height")),
    });
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "upload");
  }
}

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult<{ slug: string }>> {
  await requireAdmin();
  try {
    const data = await new SaveCategory(getContainer()).execute(input);
    publish();
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "save-category");
  }
}

export async function deleteCategoryAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new DeleteCategory(getContainer()).execute(slug);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "delete-category");
  }
}
