import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { MediaUpload, MediaUploader, StoredMedia } from "@/application/ports/media-uploader";

/** Sube las fotos a Cloudinary. El SDK toma las credenciales de CLOUDINARY_URL. */
export class CloudinaryMediaUploader implements MediaUploader {
  readonly kind = "cloudinary" as const;

  constructor(private readonly folder = "neonnight/catalogo/subidas") {
    cloudinary.config({ secure: true });
  }

  async upload(file: MediaUpload): Promise<StoredMedia> {
    const res = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: this.folder, resource_type: "image", overwrite: false }, (err, result) => {
        if (err || !result) reject(err ?? new Error("Cloudinary no devolvió resultado."));
        else resolve(result);
      });
      stream.end(Buffer.from(file.bytes));
    });
    return { src: res.secure_url, width: res.width, height: res.height };
  }
}
