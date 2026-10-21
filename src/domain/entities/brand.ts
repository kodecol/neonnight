/**
 * Marca (casa) del catálogo. El `slug` es su identidad; los productos guardan
 * el nombre en `Product.brand` y se relacionan por nombre normalizado
 * (`brandKey`), así que renombrar una marca actualiza sus productos.
 */
export type BrandLogoMode = "silhouette" | "grayscale";

export interface BrandLogo {
  readonly src: string;
  /** Proporción ancho/alto del arte. */
  readonly ratio: number;
  /**
   * Cómo se ve en reposo: `silhouette` pinta la forma en blanco (logos de un
   * color con fondo transparente, SVG o PNG); `grayscale`, la imagen en
   * escala de grises (logos de varios tonos o con fondo).
   */
  readonly mode: BrandLogoMode;
}

export interface Brand {
  readonly slug: string;
  readonly name: string;
  /** Líneas donde vende (opcional, informativo y para filtrar en el panel). */
  readonly lines: readonly string[];
  readonly logo: BrandLogo | null;
  /** Color de marca al pasar el cursor (#RRGGBB) o null para blanco. */
  readonly color: string | null;
  /** Aparece en el marquee de la home (si además tiene productos). */
  readonly visible: boolean;
  readonly order: number;
  readonly description: string | null;
}

/** "  Van Cleef  &  Árpels " → "van cleef & arpels": compara nombres sin mayúsculas, tildes ni espacios de más. */
export function brandKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
