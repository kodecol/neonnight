import type { Metadata } from "next";
import Link from "next/link";
import { ListAdminProducts } from "@/application/use-cases/admin/list-admin-products";
import { ListCategories } from "@/application/use-cases/admin/categories";
import { ListAdminLines } from "@/application/use-cases/admin/lines";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { CatalogList } from "@/presentation/components/admin/CatalogList";
import { CategoryManager } from "@/presentation/components/admin/CategoryManager";
import { LineManager } from "@/presentation/components/admin/LineManager";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { deleteCategoryAction, deleteLineAction, saveCategoryAction, saveLineAction, uploadImageAction } from "./actions";
import { requireAdmin } from "../../_lib/auth";
import { container as currentContainer } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const { tab } = await searchParams;
  const view = tab === "lineas" || tab === "categorias" ? tab : "productos";
  const container = (await currentContainer());
  const [rows, categories, lines] = await Promise.all([new ListAdminProducts(container).execute(), new ListCategories(container).execute(), new ListAdminLines(container).execute()]);
  const available = rows.filter((r) => r.status.code === "disponible" || r.status.code === "ultimas").length;

  const tabs = [
    { href: "/admin/catalogo", label: "Productos", count: rows.length, active: view === "productos" },
    { href: "/admin/catalogo?tab=lineas", label: "Líneas", count: lines.length, active: view === "lineas" },
    { href: "/admin/catalogo?tab=categorias", label: "Categorías", count: categories.length, active: view === "categorias" },
  ];

  return (
    <>
      <AdminPageHeader
        kicker={`${rows.length} productos · ${available} a la venta`}
        title="Catálogo"
        actions={
          <Button href="/admin/catalogo/nuevo" size="sm">
            + Nuevo producto
          </Button>
        }
      />
      <nav aria-label="Secciones del catálogo" className="mb-10 flex gap-8 border-b border-divider">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn("-mb-px border-b-2 pb-4 text-label uppercase transition-colors", t.active ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink")}
          >
            {t.label} <span className="ml-1 text-ink-3">{t.count}</span>
          </Link>
        ))}
      </nav>
      {view === "lineas" ? (
        <LineManager lines={lines} save={saveLineAction} remove={deleteLineAction} upload={uploadImageAction} />
      ) : view === "categorias" ? (
        <CategoryManager categories={categories} lines={lines} save={saveCategoryAction} remove={deleteCategoryAction} />
      ) : (
        <CatalogList rows={rows} lines={lines} />
      )}
    </>
  );
}
