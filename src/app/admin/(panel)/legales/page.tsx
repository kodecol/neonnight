import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetCompanySettings, ListLegalPages } from "@/application/use-cases/admin/legal";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { CompanyForm } from "@/presentation/components/admin/CompanyForm";
import { LegalPagesTable } from "@/presentation/components/admin/LegalPagesTable";
import { FormSection } from "@/presentation/components/admin/fields";
import { saveCompanyAction } from "./actions";

export const metadata: Metadata = { title: "Legales" };
export const dynamic = "force-dynamic";

export default async function LegalAdminPage() {
  const c = getContainer();
  const deps = { legalPages: c.legalPages, companySettings: c.companySettings, content: c.content, whatsappLabel: c.whatsappLabel };
  const [rows, company] = await Promise.all([new ListLegalPages(deps).execute(), new GetCompanySettings(c.content).execute()]);
  return (
    <>
      <AdminPageHeader kicker="Contenido" title="Legales" />
      <FormSection n="01" title="Páginas" aside={<span className="text-legal text-ink-3">Términos, privacidad, garantía, envíos…</span>}>
        <LegalPagesTable rows={rows} />
      </FormSection>
      <FormSection n="02" title="Datos de la empresa" aside={<span className="text-legal text-ink-3">Pie de página, páginas legales y datos para Google</span>}>
        <CompanyForm initial={company} save={saveCompanyAction} />
      </FormSection>
    </>
  );
}
