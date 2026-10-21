"use server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { parseSaveMode } from "@/application/lib/save-mode";
import {
  DeleteSiteMedia,
  DiscardHomeDraft,
  ListSiteMedia,
  RegisterSiteVideo,
  RequestVideoUpload,
  SaveHomeSettings,
  UpdateSiteMediaAlt,
  UploadSiteImage,
} from "@/application/use-cases/admin/home";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { HomeSettingsInput, SiteMediaDto } from "@/application/dto/home.dto";
import type { DirectUploadTicket } from "@/application/ports/site-media";
import { requireAdmin } from "../../_lib/auth";
import { toActionError } from "../../_lib/result";

const publish = () => revalidatePath("/", "layout");

export async function listSiteMediaAction(): Promise<ActionResult<SiteMediaDto[]>> {
  await requireAdmin();
  try {
    return { ok: true, data: await new ListSiteMedia(getContainer()).execute() };
  } catch (e) {
    return toActionError(e, "site-media-list");
  }
}

export async function uploadSiteImageAction(fd: FormData): Promise<ActionResult<SiteMediaDto>> {
  await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "No llegó ningún archivo." };
  try {
    const c = getContainer();
    const data = await new UploadSiteImage({ siteMedia: c.siteMedia, uploader: c.siteUploader, ids: c.ids, clock: c.clock }).execute({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      filename: "name" in file && typeof file.name === "string" ? file.name : "foto",
      width: Number(fd.get("width")),
      height: Number(fd.get("height")),
    });
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "site-media-upload");
  }
}

export async function requestVideoUploadAction(): Promise<ActionResult<DirectUploadTicket>> {
  await requireAdmin();
  try {
    return { ok: true, data: new RequestVideoUpload(getContainer().videoSigner).execute() };
  } catch (e) {
    return toActionError(e, "site-media-video-sign");
  }
}

export async function registerSiteVideoAction(input: { src: string; width: number; height: number }): Promise<ActionResult<SiteMediaDto>> {
  await requireAdmin();
  try {
    const c = getContainer();
    return { ok: true, data: await new RegisterSiteVideo({ siteMedia: c.siteMedia, signer: c.videoSigner, ids: c.ids, clock: c.clock }).execute(input) };
  } catch (e) {
    return toActionError(e, "site-media-video");
  }
}

export async function updateSiteMediaAltAction(input: { id: string; alt: string }): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new UpdateSiteMediaAlt(getContainer().siteMedia).execute(input);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "site-media-alt");
  }
}

export async function deleteSiteMediaAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const c = getContainer();
    await new DeleteSiteMedia({ siteMedia: c.siteMedia, homeSettings: c.homeSettings, remover: c.mediaRemover }).execute(id);
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "site-media-delete");
  }
}

/** `draft`: guarda el borrador para la vista previa (la tienda no cambia). `publish`: lo lleva a la tienda. */
export async function saveHomeSettingsAction(input: HomeSettingsInput, mode: "draft" | "publish"): Promise<ActionResult> {
  await requireAdmin();
  try {
    // Llega del cliente: sin un modo válido no se guarda (ni se publica por descarte).
    const target = parseSaveMode(mode);
    await new SaveHomeSettings(getContainer()).execute(input, target);
    if (target === "publish") publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "home-settings");
  }
}

export async function discardHomeDraftAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new DiscardHomeDraft(getContainer().homeSettings).execute();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "home-draft");
  }
}
