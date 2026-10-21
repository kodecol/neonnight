import type { MediaUploader, StoredMedia } from "../../ports/media-uploader";
import { FieldValidationError } from "../../lib/errors";
import { formatMismatch } from "../../lib/image-format";

const ALLOWED: Record<string, true> = { "image/jpeg": true, "image/png": true, "image/webp": true, "image/avif": true };
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export class UploadImage {
  constructor(private readonly uploader: MediaUploader) {}

  async execute(file: { bytes: Uint8Array; contentType: string; filename: string; width: number; height: number }): Promise<StoredMedia> {
    if (!ALLOWED[file.contentType]) throw new FieldValidationError("file", "Formato no soportado. Usa JPG, PNG, WebP o AVIF.");
    if (file.bytes.byteLength === 0) throw new FieldValidationError("file", "El archivo está vacío.");
    if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new FieldValidationError("file", "La foto supera 8 MB.");
    // El tipo lo declara el navegador (o quien llame): se confirma con los bytes.
    const mismatch = formatMismatch(file.contentType, file.bytes);
    if (mismatch) throw new FieldValidationError("file", mismatch);
    if (!Number.isInteger(file.width) || !Number.isInteger(file.height) || file.width <= 0 || file.height <= 0) {
      throw new FieldValidationError("file", "No se pudieron leer las dimensiones de la foto.");
    }
    return this.uploader.upload(file);
  }
}
