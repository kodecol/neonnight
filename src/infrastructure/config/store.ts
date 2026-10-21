import { STORE_SLUG } from "@/application/dto/brand-config.dto";

/**
 * Slug de la instancia (`STORE_SLUG`): prefijo de las claves del navegador y de
 * las carpetas de Cloudinary. Una sola imagen sirve a todas las tiendas, así que
 * se lee en runtime. Sin valor válido: "tienda".
 */
export function storeSlug(): string {
  const s = process.env.STORE_SLUG?.trim() ?? "";
  return STORE_SLUG.test(s) ? s : "tienda";
}

/**
 * Prefijo del número de pedido: STORE_ORDER_PREFIX (1–4 letras) o las
 * iniciales del slug ("aurora-joyeria" → "AJ"; Neon Night usa "NN").
 */
export function orderPrefix(): string {
  const env = process.env.STORE_ORDER_PREFIX?.trim().toUpperCase() ?? "";
  if (/^[A-Z]{1,4}$/.test(env)) return env;
  return storeSlug()
    .split("-")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

/** Carpetas de medios de la instancia en Cloudinary. */
export const mediaFolders = () => {
  const slug = storeSlug();
  return { site: `${slug}/sitio`, catalogUploads: `${slug}/catalogo/subidas` };
};
