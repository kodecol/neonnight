import { z } from "zod";

/**
 * Identidad de la tienda (marca blanca, fase 1): nombre, wordmark, textos
 * cortos e imágenes. Es el contrato del futuro `brand.config.json` del CLI de
 * Kodecol: este esquema se convertirá a JSON Schema tal cual.
 * Los datos legales de la empresa NO van aquí: viven en Legales (companySettings).
 */
const ASSET_SRC = /^(\/assets\/|\/api\/media\/|https:\/\/res\.cloudinary\.com\/)(?!.*\.\.)[\w\-./%~]+$/;

export const IdentityAssetSchema = z.object({
  src: z.string().regex(ASSET_SRC, "La imagen debe estar en Cloudinary o en el sitio."),
  alt: z.string().trim().max(120),
  /** Ancho / alto del arte (se calcula al subirlo). */
  ratio: z.number().positive().max(20),
});
export type IdentityAsset = z.infer<typeof IdentityAssetSchema>;

export const StoreIdentitySchema = z.object({
  /** Nombre de la tienda: títulos, metadatos, JSON-LD, textos ("Neon Night"). */
  name: z.string().trim().min(2, "Escribe el nombre de la tienda.").max(40),
  /** Cómo se escribe junto al isotipo, en mayúsculas ("NEON NIGHT"). */
  wordmark: z.string().trim().min(2, "Escribe el wordmark.").max(40),
  /** Frase corta bajo el hero y en el pie de página. */
  tagline: z.string().trim().min(10, "Escribe una frase de al menos 10 caracteres.").max(160),
  /** Descripción para buscadores y vistas previas (meta description). */
  description: z.string().trim().min(30, "La descripción para buscadores necesita al menos 30 caracteres.").max(200),
  /** Isotipo para fondo oscuro (cuadrado o casi). null: el del sitio. */
  isotype: IdentityAssetSchema.nullable(),
  /** Logo horizontal; si existe, reemplaza isotipo + wordmark en la barra y el pie. */
  logo: IdentityAssetSchema.nullable(),
});
export type StoreIdentityInput = z.infer<typeof StoreIdentitySchema>;
