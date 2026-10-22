import type { Metadata } from "next";
import Link from "next/link";
import { emptyAdminProductForm } from "@/application/use-cases/admin/get-admin-product";
import { TEMPLATE_LABEL } from "@/application/dto/admin.dto";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { ProductForm } from "@/presentation/components/admin/ProductForm";
import { ensureBrandAction } from "../../marcas/actions";
import { saveProductAction, uploadImageAction } from "../actions";
import { requireAdmin } from "../../../_lib/auth";
import { container } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Nuevo producto" };

/** Primero se elige la línea (decide la ficha); con `?linea=` se abre el formulario. */
export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ linea?: string }> }) {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const { linea } = await searchParams;
  const { lines, categories, brands } = (await container());
  const [allLines, cats, brandList] = await Promise.all([lines.list(), categories.list(), brands.list()]);
  const line = allLines.find((l) => l.slug === linea);

  if (!line) {
    return (
      <>
        <AdminPageHeader kicker="Catálogo · Nuevo producto" title="¿Qué vas a publicar?" />
        <ul className="m-0 grid max-w-[980px] list-none gap-4 p-0 md:grid-cols-3" data-testid="line-chooser">
          {allLines.map((l) => (
            <li key={l.slug}>
              <Link
                href={`/admin/catalogo/nuevo?linea=${l.slug}`}
                className="group flex h-full flex-col gap-3 border border-divider bg-surface-elevated p-7 transition-colors hover:border-ink"
              >
                <span className="text-label-sm uppercase text-ink-3">Plantilla {TEMPLATE_LABEL[l.template]}</span>
                <span className="text-h3 uppercase transition-colors group-hover:text-accent">{l.label}</span>
                {l.description && <span className="text-small text-ink-2">{l.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-8 text-legal text-ink-2">
          ¿Falta una línea? Créala en <Link href="/admin/catalogo?tab=lineas" className="text-ink underline-offset-4 hover:underline">Catálogo · Líneas</Link>.
        </p>
      </>
    );
  }

  const own = cats.filter((c) => c.line === line.slug);
  return (
    <ProductForm
      initial={emptyAdminProductForm(line, own[0]?.slug ?? "")}
      line={{ slug: line.slug, label: line.label, template: line.template }}
      categories={own}
      save={saveProductAction}
      upload={uploadImageAction}
      brands={brandList.map((b) => b.name)}
      createBrand={ensureBrandAction}
    />
  );
}
