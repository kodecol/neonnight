import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/presentation/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/gracias"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
