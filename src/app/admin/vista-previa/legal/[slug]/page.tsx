import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { GetLegalPreview } from "@/application/use-cases/admin/legal";
import { INFO_PAGE_SLUGS, type InfoPageSlug } from "@/application/dto/info-page.dto";
import StoreLayout from "../../../../(store)/layout";
import { InfoRoute } from "../../../../(store)/_info/render-info";
import { requireAdmin } from "../../../_lib/auth";

export const metadata: Metadata = { title: "Vista previa de página legal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * Una página legal con el borrador del panel › Legales. Vive bajo /admin
 * porque la sesión del panel solo existe ahí: nadie más la ve y no se indexa.
 */
export default async function LegalPreviewPage({ params }: { params: Params }) {
  await requireAdmin();
  const { slug } = await params;
  if (!(INFO_PAGE_SLUGS as readonly string[]).includes(slug)) notFound();
  const c = getContainer();
  const preview = await new GetLegalPreview({ legalPages: c.legalPages, companySettings: c.companySettings, content: c.content, whatsappLabel: c.whatsappLabel }).execute(slug as InfoPageSlug);
  if (!preview) notFound();
  return (
    <StoreLayout>
      <div
        className="fixed bottom-5 left-5 right-24 z-[80] flex flex-col gap-2 border border-accent bg-surface-elevated px-5 py-4 text-label-sm uppercase md:right-auto md:max-w-[440px]"
        role="status"
        data-testid="preview-banner"
      >
        <span className="flex items-center gap-2.5 text-ink">
          <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          {preview.draft ? "Vista previa del borrador · aún no publicado" : "Sin borrador: así se ve hoy en la tienda"}
        </span>
        <Link href={`/admin/legales/${slug}`} className="text-ink-2 hover:text-ink">
          Volver al editor para publicar →
        </Link>
      </div>
      <InfoRoute slug={slug as InfoPageSlug} preview={preview.page} />
    </StoreLayout>
  );
}
