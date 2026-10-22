import type { Metadata } from "next";
import { GetAppearanceEditor } from "@/application/use-cases/admin/appearance";
import { AppearanceEditor } from "@/presentation/components/admin/AppearanceEditor";
import { discardAppearanceDraftAction, saveAppearanceAction } from "./actions";
import { requireAdmin } from "../../../_lib/auth";
import { container } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Apariencia" };
export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const state = await new GetAppearanceEditor((await container()).appearance).execute();
  return <AppearanceEditor initial={state} actions={{ save: saveAppearanceAction, discard: discardAppearanceDraftAction }} />;
}
