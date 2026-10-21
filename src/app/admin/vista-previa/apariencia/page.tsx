import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { GetActiveAppearance } from "@/application/use-cases/admin/appearance";
import { ThemeStyle } from "@/presentation/components/seo/ThemeStyle";
import { StoreChrome } from "../../../(store)/_layout/store-chrome";
import { HomeView } from "../../../(store)/_home/render-home";
import { requireAdmin } from "../../_lib/auth";

export const metadata: Metadata = { title: "Vista previa de Apariencia", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * La tienda con la apariencia en borrador. El <style> del borrador va después
 * del publicado (el del layout raíz), así que lo reemplaza. Solo con sesión.
 */
export default async function AppearancePreviewPage() {
  await requireAdmin();
  const draft = await new GetActiveAppearance(getContainer().appearance).execute({ preview: true });
  return (
    <StoreChrome>
      <ThemeStyle appearance={draft} />
      <div
        className="fixed bottom-5 left-5 right-24 z-[80] flex flex-col gap-2 border border-accent bg-surface-elevated px-5 py-4 text-label-sm uppercase md:right-auto md:max-w-[440px]"
        role="status"
        data-testid="preview-banner"
      >
        <span className="flex items-center gap-2.5 text-ink">
          <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          Vista previa de la apariencia · aún no publicada
        </span>
        <Link href="/admin/ajustes/apariencia" className="text-ink-2 hover:text-ink">
          Volver al panel para publicar →
        </Link>
      </div>
      <HomeView />
    </StoreChrome>
  );
}
