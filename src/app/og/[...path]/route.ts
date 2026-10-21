import { homeCard } from "../../_og/home-card";
import { jpegResponse } from "../../_og/jpeg";
import { productOgImage } from "../../(store)/_product/og-image";

/**
 * Vistas previas al compartir, con URLs estables (sin hash de build):
 *   /og/inicio.jpg · /og/linea/<slug>.jpg · /og/producto/<slug>.jpg
 */
export const dynamic = "force-dynamic";

const notFound = () => new Response("No encontrada", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path;
  const file = path.at(-1) ?? "";
  if (!file.endsWith(".jpg")) return notFound();
  const slug = file.slice(0, -4);
  if (path.length === 1 && slug === "inicio") {
    const card = await homeCard(null);
    return card ? jpegResponse(card) : notFound();
  }
  if (path.length === 2 && path[0] === "linea") {
    const card = await homeCard(slug);
    return card ? jpegResponse(card) : notFound();
  }
  if (path.length === 2 && path[0] === "producto") {
    const card = await productOgImage(slug);
    return card ? jpegResponse(card) : notFound();
  }
  return notFound();
}
