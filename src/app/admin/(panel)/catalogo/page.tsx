import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/infrastructure/container";
import { ListAdminWatches } from "@/application/use-cases/admin/list-admin-watches";
import { ListCategories } from "@/application/use-cases/admin/categories";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { CatalogList } from "@/presentation/components/admin/CatalogList";
import { CategoryManager } from "@/presentation/components/admin/CategoryManager";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { deleteCategoryAction, saveCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const showCategories = tab === "categorias";
  const container = getContainer();
  const [rows, categories] = await Promise.all([new ListAdminWatches(container).execute(), new ListCategories(container).execute()]);
  const available = rows.filter((r) => r.availability === "disponible").length;

  const tabs = [
    { href: "/admin/catalogo", label: "Relojes", count: rows.length, active: !showCategories },
    { href: "/admin/catalogo?tab=categorias", label: "Categorías", count: categories.length, active: showCategories },
  ];

  return (
    <>
      <AdminPageHeader
        kicker={`${rows.length} piezas · ${available} disponibles`}
        title="Catálogo"
        actions={
          <Button href="/admin/catalogo/nuevo" size="sm">
            + Nuevo reloj
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
      {showCategories ? (
        <CategoryManager categories={categories} save={saveCategoryAction} remove={deleteCategoryAction} />
      ) : (
        <CatalogList rows={rows} categories={categories} />
      )}
    </>
  );
}
