import type { MetadataRoute } from "next";
import { getContainer } from "@/infrastructure/container";
import { ListWatches } from "@/application/use-cases/list-watches";
import { GetWatchBySlug } from "@/application/use-cases/get-watch-by-slug";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { watches } = getContainer();
  const list = await new ListWatches(watches).execute();
  const details = await Promise.all(list.map((w) => new GetWatchBySlug(watches).execute(w.slug)));
  const latest = details.reduce<Date>((acc, d) => (new Date(d.updatedAt) > acc ? new Date(d.updatedAt) : acc), new Date(0));
  return [
    { url: absoluteUrl(ROUTES.home), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(ROUTES.collection), lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    ...details.map((d) => ({ url: absoluteUrl(ROUTES.watch(d.slug)), lastModified: new Date(d.updatedAt), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
