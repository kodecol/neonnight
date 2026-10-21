import { iconResponse, isIconFile } from "../../_icons/render";

/** Íconos de la pantalla de inicio y del manifest: /icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png. */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isIconFile(file)) return new Response("No encontrado", { status: 404 });
  return iconResponse(file, new URL(req.url).searchParams.get("v"));
}
