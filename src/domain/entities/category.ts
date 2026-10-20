/** Categoría del catálogo, administrable desde el panel. El slug es su identidad. */
export interface Category {
  readonly slug: string;
  readonly label: string;
  readonly order: number;
}
