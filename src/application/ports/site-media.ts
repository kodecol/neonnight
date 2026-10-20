/**
 * Biblioteca de medios del sitio (fuera del catálogo): fotos y videos que se
 * suben una vez y se usan en la página de inicio (hero, banda…).
 */
export type SiteMediaKind = "image" | "video";

export interface SiteMedia {
  readonly id: string;
  readonly kind: SiteMediaKind;
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** Fotograma de portada de un video (Cloudinary lo genera); null en fotos. */
  readonly poster: string | null;
  readonly createdAt: Date;
}

export interface SiteMediaRepository {
  list(): Promise<readonly SiteMedia[]>;
  findById(id: string): Promise<SiteMedia | null>;
  save(media: SiteMedia): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Subida directa de videos del navegador a Cloudinary con firma del servidor:
 * los archivos grandes no pasan por la app.
 */
export interface DirectUploadTicket {
  readonly url: string;
  readonly fields: Readonly<Record<string, string>>;
}

export interface VideoUploadSigner {
  readonly enabled: boolean;
  sign(): DirectUploadTicket;
  /** El `src` devuelto por Cloudinary pertenece a nuestra cuenta y carpeta. */
  owns(src: string): boolean;
  /** URL del fotograma inicial del video. */
  posterOf(src: string): string;
}

/** Borra el archivo en el proveedor cuando se quita de la biblioteca (no-op en disco local). */
export interface MediaRemover {
  remove(src: string, kind: SiteMediaKind): Promise<void>;
}
