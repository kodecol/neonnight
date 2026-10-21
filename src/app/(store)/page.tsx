import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";
import { OG_PATHS, ogImage, shareMetadata } from "./_info/og";
import { HomeView } from "./_home/render-home";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getContainer().content.get();
  const title = `${brand.name} — Relojes, joyas y perfumes verificados`;
  return {
    title: { absolute: title },
    alternates: { canonical: absoluteUrl(ROUTES.home) },
    ...shareMetadata({ title, description: brand.description, url: absoluteUrl(ROUTES.home), siteName: brand.name, locale: brand.locale, image: ogImage(OG_PATHS.home, `${brand.name} — relojes, joyas y perfumes de las grandes casas`) }),
  };
}

export default function HomePage() {
  return <HomeView />;
}
