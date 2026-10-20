export interface MediaUpload {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly filename: string;
  /** Dimensiones medidas en el navegador; el proveedor puede corregirlas. */
  readonly width: number;
  readonly height: number;
}

export interface StoredMedia {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/** Almacenamiento de fotos del catálogo (Cloudinary en producción, disco en desarrollo). */
export interface MediaUploader {
  readonly kind: "cloudinary" | "local";
  upload(file: MediaUpload): Promise<StoredMedia>;
}
