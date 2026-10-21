import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetIdentityEditor } from "@/application/use-cases/admin/identity";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { IdentityEditor } from "@/presentation/components/admin/IdentityEditor";
import { Button } from "@/presentation/components/primitives/Button";
import { discardIdentityDraftAction, saveIdentityAction, uploadIdentityAssetAction } from "./actions";

export const metadata: Metadata = { title: "Identidad" };
export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  const c = getContainer();
  // La identidad del código (sin lo editado) es la "de fábrica" del editor.
  const state = await new GetIdentityEditor(c.identity).execute((await c.codeContent.get()).brand);
  return (
    <>
      <AdminPageHeader
        kicker="Marca blanca"
        title="Identidad"
        actions={
          <Button href="/" variant="ghost" size="sm" target="_blank" rel="noreferrer">
            Ver la tienda ↗
          </Button>
        }
      />
      <IdentityEditor initial={state} actions={{ save: saveIdentityAction, discard: discardIdentityDraftAction, upload: uploadIdentityAssetAction }} />
    </>
  );
}
