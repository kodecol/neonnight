import type { ProductImage, ProductMedia, ProductVideo } from "../entities/product";

/**
 * Biblioteca de medios de una pieza: una sola lista de fotos y un conjunto de
 * usos que apuntan a ellas por `src`. Portada, segunda vista, hero e imagen
 * final admiten una foto cada uno; la galería, varias.
 */
export const MEDIA_ROLES = ["front", "back", "hero", "band"] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];

export const isVideo = (m: ProductImage | ProductVideo | null | undefined): m is ProductVideo => !!m && "poster" in m;

/** Todas las fotos de la pieza sin repetir: primero la biblioteca y luego cualquier uso que faltara en ella. */
export function libraryOf(media: Omit<ProductMedia, "library"> & { library?: readonly ProductImage[] | null }): ProductImage[] {
  const seen = new Map<string, ProductImage>();
  const add = (img: ProductImage | null | undefined) => {
    if (img && !seen.has(img.src)) seen.set(img.src, img);
  };
  media.library?.forEach(add);
  add(media.front);
  add(media.back);
  if (!isVideo(media.hero)) add(media.hero);
  add(media.band);
  media.gallery.forEach(add);
  return [...seen.values()];
}

/** Completa la biblioteca de medios guardados antes de que existiera (documentos y seeds antiguos). */
export function withLibrary(media: Omit<ProductMedia, "library"> & { library?: readonly ProductImage[] | null }): ProductMedia {
  return { ...media, library: libraryOf(media) };
}

export interface MediaAssignment {
  library: readonly ProductImage[];
  /** `src` de la foto de cada uso; en `hero`, "video" conserva el video actual. */
  roles: { front: string | null; back: string | null; hero: string | null; band: string | null };
  /** `src` de las fotos que salen en la galería; el orden es el de la biblioteca. */
  gallery: readonly string[];
}

export const HERO_VIDEO = "video";

/**
 * Arma los medios a partir de la biblioteca y los usos elegidos. Un uso que
 * apunta a una foto que no está en la biblioteca es un error del llamador.
 */
export function assignMedia(a: MediaAssignment, keep: { heroVideo: ProductVideo | null; video: ProductVideo | null }): ProductMedia {
  const bySrc = new Map(a.library.map((img) => [img.src, img] as const));
  const pick = (src: string | null): ProductImage | null => {
    if (src === null) return null;
    const img = bySrc.get(src);
    if (!img) throw new Error(`La foto ${src} no está en la biblioteca.`);
    return img;
  };
  const inGallery = new Set(a.gallery);
  for (const src of inGallery) pick(src);
  return {
    library: [...a.library],
    front: pick(a.roles.front),
    back: pick(a.roles.back),
    hero: a.roles.hero === HERO_VIDEO ? keep.heroVideo : pick(a.roles.hero),
    band: pick(a.roles.band),
    gallery: a.library.filter((img) => inGallery.has(img.src)),
    video: keep.video,
  };
}
