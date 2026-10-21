/** Rótulo y aviso del marquee de marcas editados en el panel (null: los del código). */
export interface BrandsCopy {
  readonly label: string | null;
  readonly disclaimer: string | null;
}

export interface BrandsCopyRepository {
  get(): Promise<BrandsCopy>;
  save(copy: BrandsCopy): Promise<void>;
}
