import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetAppearanceEditor } from "@/application/use-cases/admin/appearance";
import { AppearanceEditor } from "@/presentation/components/admin/AppearanceEditor";
import { discardAppearanceDraftAction, saveAppearanceAction } from "./actions";

export const metadata: Metadata = { title: "Apariencia" };
export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const state = await new GetAppearanceEditor(getContainer().appearance).execute();
  return <AppearanceEditor initial={state} actions={{ save: saveAppearanceAction, discard: discardAppearanceDraftAction }} />;
}
