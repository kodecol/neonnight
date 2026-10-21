import { versioned } from "@/application/use-cases/brand-assets";
import { brandAssets } from "../_icons/render";

/**
 * Manifest de la tienda ("Agregar a la pantalla de inicio"): nombre de
 * Identidad, colores de Apariencia e íconos con la versión publicada.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const brand = await brandAssets();
  const icon = (file: string) => versioned(`/icons/${file}`, brand.version);
  const manifest = {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    lang: brand.locale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brand.bg,
    theme_color: brand.bg,
    icons: [
      { src: icon("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon("maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  const requested = new URL(req.url).searchParams.get("v");
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": brand.version && requested === brand.version ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    },
  });
}
