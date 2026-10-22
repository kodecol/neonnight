import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/presentation/lib/site";
import { siteBaseUrl } from "@/app/_lib/tenant";

/** Dinámico: la URL del sitemap sale de SITE_URL en runtime, no del build. */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteBase = await siteBaseUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/gracias", "/checkout", "/admin"] }],
    sitemap: absoluteUrl("/sitemap.xml", siteBase),
  };
}
