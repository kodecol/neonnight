import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetBrandsCopy, ListAdminBrands } from "@/application/use-cases/admin/brands";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { BrandManager } from "@/presentation/components/admin/BrandManager";
import { deleteBrandAction, reorderBrandsAction, saveBrandAction, saveBrandsCopyAction, uploadBrandLogoAction } from "./actions";
import { requireAdmin } from "../../_lib/auth";

export const metadata: Metadata = { title: "Marcas" };
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const c = getContainer();
  const [brands, copy, lines, site] = await Promise.all([new ListAdminBrands(c).execute(), new GetBrandsCopy(c.brandsCopy).execute(), c.lines.list(), c.content.get()]);
  return (
    <>
      <AdminPageHeader kicker="Catálogo" title="Marcas" />
      <BrandManager
        initial={brands}
        copy={copy}
        defaults={{ label: site.home.brands.label, disclaimer: site.home.brands.disclaimer }}
        lines={lines.map((l) => ({ slug: l.slug, label: l.label }))}
        actions={{ save: saveBrandAction, remove: deleteBrandAction, reorder: reorderBrandsAction, uploadLogo: uploadBrandLogoAction, saveCopy: saveBrandsCopyAction }}
      />
    </>
  );
}
