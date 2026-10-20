import type { Metadata } from "next";
import { ProductPage, productMetadata } from "../../_product/render-product";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return productMetadata((await params).slug);
}

export default async function Page({ params }: { params: Params }) {
  return <ProductPage slug={(await params).slug} kind="perfume" />;
}
