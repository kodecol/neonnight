import type { Metadata } from "next";
import { CatalogPage, catalogMetadata } from "../render-catalog";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

type Params = Promise<{ linea: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  return catalogMetadata((await params).linea, await searchParams);
}

export default async function LinePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return <CatalogPage line={(await params).linea} params={await searchParams} />;
}
