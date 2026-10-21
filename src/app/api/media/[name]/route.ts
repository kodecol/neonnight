import { readLocalMedia } from "@/infrastructure/media/local-disk-uploader";

/** Sirve las fotos subidas en desarrollo (sin Cloudinary). Nombres aleatorios e inmutables. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = await readLocalMedia(name);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Un SVG abierto directamente no puede ejecutar nada ni cargar recursos.
      ...(file.contentType === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
