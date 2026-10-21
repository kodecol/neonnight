import { iconResponse } from "../_icons/render";

/** Favicon de la pestaña: el isotipo de Identidad sobre el fondo de Apariencia (16, 32 y 48 px). */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return iconResponse("favicon.ico", new URL(req.url).searchParams.get("v"));
}
