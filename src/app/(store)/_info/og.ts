/** Imagen de vista previa general (`/og`) y la de cada línea (`/og?linea=…`), 1200 × 630. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function ogImage(alt: string, line?: string) {
  return { url: line ? `/og?linea=${encodeURIComponent(line)}` : "/og", ...OG_IMAGE_SIZE, alt, type: "image/png" };
}
