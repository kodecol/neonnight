import type { MetadataRoute } from "next";
import { getContainer } from "@/infrastructure/container";
import { ListLines } from "@/application/use-cases/list-lines";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const container = getContainer();
  const [products, lines] = await Promise.all([container.products.findAll(), new ListLines(container).execute()]);
  const latest = products.reduce<Date>((acc, p) => (p.updatedAt > acc ? p.updatedAt : acc), new Date(0));
  const lastOf = (line: string) => products.filter((p) => p.line === line).reduce<Date>((acc, p) => (p.updatedAt > acc ? p.updatedAt : acc), new Date(0));
  return [
    { url: absoluteUrl(ROUTES.home), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(ROUTES.collection), lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    ...lines.map((l) => ({ url: absoluteUrl(ROUTES.line(l.slug)), lastModified: lastOf(l.slug), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...products.map((p) => ({ url: absoluteUrl(ROUTES.product(p.specs.kind, p.slug.value)), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
