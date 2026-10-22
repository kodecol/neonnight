import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { MediaUpload, MediaUploader, StoredMedia } from "@/application/ports/media-uploader";

/** Formato que Cloudinary debe detectar para cada tipo (ya confirmado por los bytes al subir). */
const FORMATS: Record<string, string[]> = { "image/jpeg": ["jpg"], "image/png": ["png"], "image/webp": ["webp"], "image/avif": ["avif"], "image/svg+xml": ["svg"] };

/** Sube las fotos a Cloudinary. El SDK toma las credenciales de CLOUDINARY_URL. */
export class CloudinaryMediaUploader implements MediaUploader {
  readonly kind = "cloudinary" as const;

  constructor(private readonly folder: string) {
    cloudinary.config({ secure: true });
  }

  async upload(file: MediaUpload): Promise<StoredMedia> {
    // Cloudinary rechaza el archivo si lo que detecta no es el formato declarado.
    const allowed = FORMATS[file.contentType];
    if (!allowed) throw new Error(`Tipo no soportado: ${file.contentType}`);
    const res = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: this.folder, resource_type: "image", overwrite: false, allowed_formats: allowed }, (err, result) => {
        if (err || !result) reject(err ?? new Error("Cloudinary no devolvió resultado."));
        else resolve(result);
      });
      stream.end(Buffer.from(file.bytes));
    });
    return { src: res.secure_url, width: res.width, height: res.height };
  }
}
