import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";
import { ogImage } from "./_info/og";
import { HomeView } from "./_home/render-home";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getContainer().content.get();
  const title = `${brand.name} — Relojes, joyas y perfumes verificados`;
  return {
    title: { absolute: title },
    alternates: { canonical: absoluteUrl(ROUTES.home) },
    openGraph: { type: "website", url: absoluteUrl(ROUTES.home), title, description: brand.description, siteName: brand.name, images: [ogImage(brand.name)] },
  };
}

export default function HomePage() {
  return <HomeView />;
}
