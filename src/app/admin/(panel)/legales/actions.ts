"use server";
import { revalidatePath } from "next/cache";
import { parseSaveMode } from "@/application/lib/save-mode";
import { DiscardLegalDraft, ResetLegalPage, SaveCompanySettings, SaveLegalPage } from "@/application/use-cases/admin/legal";
import { INFO_PAGE_SLUGS, type InfoPageSlug } from "@/application/dto/info-page.dto";
import type { ActionResult } from "@/application/dto/admin.dto";
import type { CompanyInput, LegalPageInput } from "@/application/dto/legal.dto";
import { requireAdmin } from "../../_lib/auth";
import { toActionError } from "../../_lib/result";
import { container } from "@/app/_lib/tenant";

const publish = () => revalidatePath("/", "layout");
const isSlug = (s: string): s is InfoPageSlug => (INFO_PAGE_SLUGS as readonly string[]).includes(s);

async function deps() {
  const c = await container();
  return { legalPages: c.legalPages, companySettings: c.companySettings, content: c.content, whatsappLabel: c.whatsappLabel, clock: c.clock };
}

/** `draft`: guarda el borrador para la vista previa (la tienda no cambia). `publish`: publica con la siguiente versión. */
export async function saveLegalPageAction(slug: string, input: LegalPageInput, mode: "draft" | "publish"): Promise<ActionResult<{ version: string | null }>> {
  await requireAdmin();
  if (!isSlug(slug)) return { ok: false, error: "Esa página no existe." };
  try {
    // Llega del cliente: sin un modo válido no se guarda (ni se publica por descarte).
    const target = parseSaveMode(mode);
    const data = await new SaveLegalPage(await deps()).execute(slug, input, target);
    if (target === "publish") publish();
    return { ok: true, data };
  } catch (e) {
    return toActionError(e, "legal-save");
  }
}

export async function discardLegalDraftAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isSlug(slug)) return { ok: false, error: "Esa página no existe." };
  try {
    await new DiscardLegalDraft((await container()).legalPages).execute(slug);
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "legal-discard");
  }
}

export async function resetLegalPageAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isSlug(slug)) return { ok: false, error: "Esa página no existe." };
  try {
    await new ResetLegalPage(await deps()).execute(slug);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "legal-reset");
  }
}

export async function saveCompanyAction(input: CompanyInput): Promise<ActionResult> {
  await requireAdmin();
  try {
    await new SaveCompanySettings(await deps()).execute(input);
    publish();
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e, "company");
  }
}
