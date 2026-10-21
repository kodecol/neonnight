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

/** Carpetas de medios de la instancia en Cloudinary. */
export const mediaFolders = () => {
  const slug = storeSlug();
  return { site: `${slug}/sitio`, catalogUploads: `${slug}/catalogo/subidas` };
};
