const CLOUDINARY_HOST = "https://res.cloudinary.com/";

export function isCloudinary(src: string): boolean {
  return src.startsWith(CLOUDINARY_HOST);
}

/**
 * URL de entrega de Cloudinary al ancho pedido, en el mejor formato que acepte
 * el navegador (`f_auto`: AVIF/WebP, con transparencia) y calidad automática.
 * Así las fotos del catálogo salen del CDN de Cloudinary y el servidor no las
 * procesa ni las guarda en caché.
 */
export function cloudinaryUrl(src: string, width: number, quality?: number): string {
  const transform = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
  return src.replace(/\/(image|video)\/upload\//, (m) => `${m}${transform}/`);
}
