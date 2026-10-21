import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { GetLegalEditor } from "@/application/use-cases/admin/legal";
import { INFO_PAGE_SLUGS, type InfoPageSlug } from "@/application/dto/info-page.dto";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { LegalEditor } from "@/presentation/components/admin/LegalEditor";
import { Button } from "@/presentation/components/primitives/Button";
import { discardLegalDraftAction, resetLegalPageAction, saveLegalPageAction } from "../actions";
import { requireAdmin } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const isSlug = (s: string): s is InfoPageSlug => (INFO_PAGE_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: `Legales · ${(await params).slug}` };
}

export default async function LegalEditPage({ params }: { params: Params }) {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const c = getContainer();
  const editor = await new GetLegalEditor({ legalPages: c.legalPages, companySettings: c.companySettings, content: c.content, whatsappLabel: c.whatsappLabel }).execute(slug);
  return (
    <>
      <AdminPageHeader
        kicker={`Legales · /${slug}`}
        title={editor.content.title}
        actions={
          <Button href={`/${slug}`} variant="ghost" size="sm" target="_blank" rel="noreferrer">
            Ver en la tienda ↗
          </Button>
        }
      />
      <LegalEditor
        initial={editor}
        actions={{
          save: saveLegalPageAction.bind(null, slug),
          discard: discardLegalDraftAction.bind(null, slug),
          reset: resetLegalPageAction.bind(null, slug),
        }}
      />
    </>
  );
}
