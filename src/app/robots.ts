import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/presentation/lib/site";
import { siteBaseUrl } from "@/app/_lib/tenant";
import { tenancy } from "@/infrastructure/config/instance";

/** Dinámico: la URL del sitemap sale de SITE_URL en runtime, no del build. */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteBase = await siteBaseUrl();
  // Las demos no se indexan: nada que rastrear y sin sitemap.
  if (tenancy() === "multi") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/gracias", "/checkout", "/admin"] }],
    sitemap: absoluteUrl("/sitemap.xml", siteBase),
  };
}
