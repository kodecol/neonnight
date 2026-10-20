import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaUpload, MediaUploader, StoredMedia } from "@/application/ports/media-uploader";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const TYPE: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
const NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|avif)$/;

export const LOCAL_MEDIA_ROUTE = "/api/media";

export function localMediaDir(): string {
  return process.env.MEDIA_DIR || path.join(process.cwd(), ".data", "uploads");
}

/**
 * Solo para desarrollo (sin CLOUDINARY_URL): guarda en disco y sirve por
 * `/api/media/<archivo>`. En un contenedor el disco es efímero.
 */
export class LocalDiskMediaUploader implements MediaUploader {
  readonly kind = "local" as const;

  constructor(private readonly dir: string = localMediaDir()) {}

  async upload(file: MediaUpload): Promise<StoredMedia> {
    const ext = EXT[file.contentType];
    if (!ext) throw new Error(`Tipo no soportado: ${file.contentType}`);
    const name = `${randomUUID()}.${ext}`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, name), file.bytes);
    return { src: `${LOCAL_MEDIA_ROUTE}/${name}`, width: file.width, height: file.height };
  }
}

/** Lee un archivo subido. Devuelve null si el nombre no es válido o no existe. */
export async function readLocalMedia(name: string, dir: string = localMediaDir()): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!NAME_RE.test(name)) return null;
  const ext = name.split(".").pop() ?? "";
  try {
    return { bytes: await readFile(path.join(dir, name)), contentType: TYPE[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
