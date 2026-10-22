/**
 * Arranque del servidor (Next lo espera antes de atender peticiones).
 * Solo en Node: aplica el brand pack de STORE_BRAND_PACK si la base aún no
 * tiene marca (ver instrumentation-node.ts). El `if` con la comparación
 * literal de NEXT_RUNTIME es el patrón de Next: así el bundle del runtime
 * edge descarta el import (Cloudinary y Mongo no existen ahí).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
