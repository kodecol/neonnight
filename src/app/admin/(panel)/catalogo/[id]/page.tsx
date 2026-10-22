import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GetAdminProduct } from "@/application/use-cases/admin/get-admin-product";
import { ProductForm } from "@/presentation/components/admin/ProductForm";
import { ensureBrandAction } from "../../marcas/actions";
import { deleteProductAction, saveProductAction, uploadImageAction } from "../actions";
import { requireAdmin } from "../../../_lib/auth";
import { container } from "@/app/_lib/tenant";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const p = await new GetAdminProduct((await container()).products).execute(id);
  return { title: p ? `${p.brand} ${p.model}` : "Producto" };
}

export default async function EditProductPage({ params, searchParams }: { params: Params; searchParams: Promise<{ creado?: string }> }) {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const { id } = await params;
  const { creado } = await searchParams;
  const { products, categories, lines, brands } = (await container());
  const [product, cats, allLines, entity, brandList] = await Promise.all([new GetAdminProduct(products).execute(id), categories.list(), lines.list(), products.findById(id), brands.list()]);
  if (!product) notFound();
  const line = allLines.find((l) => l.slug === product.line);
  if (!line) notFound();
  return (
    <ProductForm
      key={product.id}
      initial={product}
      line={{ slug: line.slug, label: line.label, template: line.template }}
      categories={cats.filter((c) => c.line === line.slug)}
      save={saveProductAction}
      remove={deleteProductAction}
      upload={uploadImageAction}
      brands={brandList.map((b) => b.name)}
      createBrand={ensureBrandAction}
      updatedAt={entity?.updatedAt.toISOString()}
      justCreated={creado === "1"}
    />
  );
}
