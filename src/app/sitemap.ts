import type { MetadataRoute } from "next";
import { ListLines } from "@/application/use-cases/list-lines";
import { INFO_PAGE_SLUGS } from "@/application/dto/info-page.dto";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";
import { container as currentContainer, siteBaseUrl } from "@/app/_lib/tenant";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteBase = await siteBaseUrl();
  const container = (await currentContainer());
  const [products, lines] = await Promise.all([container.products.findAll(), new ListLines(container).execute()]);
  const latest = products.reduce<Date>((acc, p) => (p.updatedAt > acc ? p.updatedAt : acc), new Date(0));
  const lastOf = (line: string) => products.filter((p) => p.line === line).reduce<Date>((acc, p) => (p.updatedAt > acc ? p.updatedAt : acc), new Date(0));
  return [
    { url: absoluteUrl(ROUTES.home, siteBase), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(ROUTES.collection, siteBase), lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    ...lines.map((l) => ({ url: absoluteUrl(ROUTES.line(l.slug), siteBase), lastModified: lastOf(l.slug), changeFrequency: "weekly" as const, priority: 0.9 })),
    // Institucionales y legales: cambian poco y su fecha es la de vigencia.
    ...(await Promise.all(INFO_PAGE_SLUGS.map((slug) => container.content.page(slug))))
      .filter((p) => p !== null)
      .map((p) => ({ url: absoluteUrl(`/${p.slug}`, siteBase), lastModified: new Date(`${p.updatedAt}T00:00:00Z`), changeFrequency: "yearly" as const, priority: p.slug === "nosotros" ? 0.6 : 0.4 })),
    ...products.map((p) => ({ url: absoluteUrl(ROUTES.product(p.specs.kind, p.slug.value), siteBase), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
