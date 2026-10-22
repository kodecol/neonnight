import neonnight from "../../../brands/neonnight/brand.json";

/**
 * Brand packs que viajan DENTRO del build (import estático: el bundler los
 * incluye aunque el hosting corra la salida standalone sin el árbol del repo).
 * La clave es la ruta que se pone en STORE_BRAND_PACK.
 */
export const BUNDLED_BRAND_PACKS: Record<string, unknown> = {
  "brands/neonnight/brand.json": neonnight,
};
