import type { Metadata } from "next";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";
import { OG_PATHS, ogImage, shareMetadata } from "./_info/og";
import { HomeView } from "./_home/render-home";
import { container, siteBaseUrl } from "@/app/_lib/tenant";

/** El catálogo vive en la base (editable desde /admin): se renderiza por petición. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteBase = await siteBaseUrl();
  const { brand } = await (await container()).content.get();
  const title = `${brand.name} — ${brand.titleSuffix}`;
  return {
    title: { absolute: title },
    alternates: { canonical: absoluteUrl(ROUTES.home, siteBase) },
    ...shareMetadata({ title, description: brand.description, url: absoluteUrl(ROUTES.home, siteBase), siteName: brand.name, locale: brand.locale, image: await ogImage(OG_PATHS.home, `${brand.name} — relojes, joyas y perfumes de las grandes casas`) }),
  };
}

export default function HomePage() {
  return <HomeView />;
}
