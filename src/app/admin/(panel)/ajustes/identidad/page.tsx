import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetIdentityEditor } from "@/application/use-cases/admin/identity";
import { IdentityEditor } from "@/presentation/components/admin/IdentityEditor";
import { discardIdentityDraftAction, saveIdentityAction, uploadIdentityAssetAction } from "./actions";
import { requireAdmin } from "../../../_lib/auth";

export const metadata: Metadata = { title: "Identidad · Ajustes" };
export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const c = getContainer();
  // La identidad del código (sin lo editado) es la "de fábrica" del editor.
  const state = await new GetIdentityEditor(c.identity).execute((await c.codeContent.get()).brand);
  return <IdentityEditor initial={state} actions={{ save: saveIdentityAction, discard: discardIdentityDraftAction, upload: uploadIdentityAssetAction }} />;
}
