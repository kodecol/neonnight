/** Categoría dentro de una línea, administrable desde el panel. El slug es su identidad. */
export interface Category {
  readonly slug: string;
  readonly label: string;
  readonly order: number;
  /** Slug de la `ProductLine` a la que pertenece. */
  readonly line: string;
}
