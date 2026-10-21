import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/presentation/lib/site";

/** Dinámico: la URL del sitemap sale de SITE_URL en runtime, no del build. */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/gracias", "/checkout", "/admin"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
