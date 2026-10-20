import type { Metadata } from "next";
import Link from "next/link";
import StoreLayout from "../../(store)/layout";
import { HomeView } from "../../(store)/_home/render-home";
import { requireAdmin } from "../_lib/auth";

export const metadata: Metadata = { title: "Vista previa de Inicio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * La home con el borrador del panel › Inicio. Vive bajo /admin porque la
 * sesión del panel solo existe ahí: nadie más la ve y no se indexa.
 */
export default async function HomePreviewPage() {
  await requireAdmin();
  return (
    <StoreLayout>
      <div
        className="fixed bottom-5 left-5 right-24 z-[80] flex flex-col gap-2 border border-accent bg-surface-elevated px-5 py-4 text-label-sm uppercase md:right-auto md:max-w-[440px]"
        role="status"
        data-testid="preview-banner"
      >
        <span className="flex items-center gap-2.5 text-ink">
          <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          Vista previa del borrador · aún no publicado
        </span>
        <Link href="/admin/inicio" className="text-ink-2 hover:text-ink">
          Volver al panel para publicar →
        </Link>
      </div>
      <HomeView preview />
    </StoreLayout>
  );
}
