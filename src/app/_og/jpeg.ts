import sharp from "sharp";

/**
 * Las vistas previas se sirven en JPEG (más livianas; WhatsApp las prefiere)
 * y con buffer: longitud fija (`Content-Length`) en lugar de streaming, que
 * algunos clientes descartan. Caché pública de un día en el CDN o proxy.
 */
export async function jpegResponse(png: Response): Promise<Response> {
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .flatten({ background: "#000000" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    status: 200,
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(jpeg.byteLength),
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
