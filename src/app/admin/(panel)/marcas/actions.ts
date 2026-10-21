"use server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { DeleteBrand, EnsureBrand, ReorderBrands, SaveBrand, SaveBrandsCopy, UploadBrandLogo } from "@/application/use-cases/admin/brands";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { BrandDto, BrandInput, BrandsCopyInput } from "@/application/dto/brand.dto";
import { requireAdmin } from "../../_lib/auth";
import { toActionError } from "../../_lib/result";

/** Las marcas se ven en la home (marquee) y en las fichas: se revalida toda la tienda. */
const publish = () => revalidatePath("/", "layout");

export async function saveBrandAction(input: BrandInput): Promise<ActionResult<BrandDto>> {
  await requireAdmin();
  try {
    const data = await new SaveBrand(getContainer()).execute(input);
    publish();
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "brand-save");
  }
}

/** Desde el formulario de producto: crea la marca solo con su nombre (o devuelve la existente). */
export async function ensureBrandAction(name: string): Promise<ActionResult<BrandDto>> {
  await requireAdmin();
  try {
    const data = await new EnsureBrand(getContainer()).execute(name);
    publish();
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "brand-ensure");
  }
}

export async function deleteBrandAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new DeleteBrand(getContainer()).execute(slug);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "brand-delete");
  }
}

export async function reorderBrandsAction(slugs: string[]): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new ReorderBrands(getContainer().brands).execute(slugs);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "brand-order");
  }
}

export async function uploadBrandLogoAction(fd: FormData): Promise<ActionResult<{ src: string; ratio: number }>> {
  await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "No llegó ningún archivo." };
  try {
    const data = await new UploadBrandLogo(getContainer().brandUploader).execute({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      filename: "name" in file && typeof file.name === "string" ? file.name : "logo",
      width: Number(fd.get("width")),
      height: Number(fd.get("height")),
    });
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "brand-logo");
  }
}

export async function saveBrandsCopyAction(input: BrandsCopyInput): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new SaveBrandsCopy(getContainer().brandsCopy).execute(input);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "brand-copy");
  }
}
