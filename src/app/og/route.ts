import { homeCard } from "../_og/home-card";
import { jpegResponse } from "../_og/jpeg";

/** Compatibilidad con los enlaces ya compartidos: `/og` y `/og?linea=<slug>`. */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const card = await homeCard(new URL(req.url).searchParams.get("linea"));
  return card ? jpegResponse(card) : new Response("No encontrada", { status: 404 });
}
