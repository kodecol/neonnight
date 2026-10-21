import type { Brand } from "../entities/brand";

export interface BrandRepository {
  /** Por `order` y luego por nombre. */
  list(): Promise<readonly Brand[]>;
  findBySlug(slug: string): Promise<Brand | null>;
  /** Inserta o reemplaza por `slug`. */
  save(brand: Brand): Promise<void>;
  delete(slug: string): Promise<void>;
}
