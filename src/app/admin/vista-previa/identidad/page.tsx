import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { StoreChrome } from "../../../(store)/_layout/store-chrome";
import { HomeView } from "../../../(store)/_home/render-home";
import { requireAdmin } from "../../_lib/auth";

export const metadata: Metadata = { title: "Vista previa de Identidad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** La tienda con la identidad en borrador (nombre, wordmark, isotipo, logo). Solo con sesión del panel. */
export default async function IdentityPreviewPage() {
  await requireAdmin();
  const { identity } = getContainer();
  const draft = (await identity.getDraft()) ?? (await identity.get()) ?? undefined;
  return (
    <StoreChrome identity={draft}>
      <div
        className="fixed bottom-5 left-5 right-24 z-[80] flex flex-col gap-2 border border-accent bg-surface-elevated px-5 py-4 text-label-sm uppercase md:right-auto md:max-w-[440px]"
        role="status"
        data-testid="preview-banner"
      >
        <span className="flex items-center gap-2.5 text-ink">
          <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          Vista previa de la identidad · aún no publicada
        </span>
        <Link href="/admin/ajustes/identidad" className="text-ink-2 hover:text-ink">
          Volver al panel para publicar →
        </Link>
      </div>
      <HomeView identity={draft} />
    </StoreChrome>
  );
}
