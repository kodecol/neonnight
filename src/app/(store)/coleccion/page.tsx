import type { Metadata } from "next";
import { CatalogPage, catalogMetadata } from "./render-catalog";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  return catalogMetadata(null, await searchParams);
}

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  return <CatalogPage line={null} params={await searchParams} />;
}
