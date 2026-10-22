import { v2 as cloudinary } from "cloudinary";
import type { DirectUploadTicket, MediaRemover, SiteMediaKind, VideoUploadSigner } from "@/application/ports/site-media";



const configured = () => {
  cloudinary.config({ secure: true });
  const c = cloudinary.config();
  return c.cloud_name && c.api_key && c.api_secret ? c : null;
};

/**
 * Firma subidas directas de video del navegador a Cloudinary (carpeta del
 * sitio, solo video). El archivo nunca pasa por la app.
 */
export class CloudinaryVideoSigner implements VideoUploadSigner {
  /** `folder`: carpeta del sitio de la tienda (`<slug>/sitio`). */
  constructor(private readonly folder: string) {}

  get enabled(): boolean {
    return configured() !== null;
  }

  sign(): DirectUploadTicket {
    const c = configured();
    if (!c) throw new Error("Cloudinary no está configurado.");
    const timestamp = String(Math.round(Date.now() / 1000));
    const params = { folder: this.folder, timestamp };
    const signature = cloudinary.utils.api_sign_request(params, c.api_secret!);
    return { url: `https://api.cloudinary.com/v1_1/${c.cloud_name}/video/upload`, fields: { ...params, api_key: c.api_key!, signature } };
  }

  owns(src: string): boolean {
    const c = configured();
    return !!c && src.startsWith(`https://res.cloudinary.com/${c.cloud_name}/video/upload/`) && src.includes(`/${this.folder}/`);
  }

  posterOf(src: string): string {
    return src.replace("/video/upload/", "/video/upload/so_0/").replace(/\.\w+$/, ".jpg");
  }
}

/** `https://res.cloudinary.com/<nube>/image/upload/v123/<slug>/sitio/x.jpg` → `<slug>/sitio/x`. */
export function publicIdOf(src: string): string | null {
  const m = /\/(?:image|video)\/upload\/(?:v\d+\/)?(.+)\.\w+$/.exec(src);
  return m ? m[1]! : null;
}

/** Borra de Cloudinary los medios del sitio que se quitan de la biblioteca (nunca los del catálogo). */
export class CloudinaryMediaRemover implements MediaRemover {
  constructor(private readonly folder: string) {}

  async remove(src: string, kind: SiteMediaKind): Promise<void> {
    const id = publicIdOf(src);
    if (!id || !id.startsWith(`${this.folder}/`) || !configured()) return;
    await cloudinary.uploader.destroy(id, { resource_type: kind, invalidate: true });
  }
}

/** Sin Cloudinary (desarrollo): no hay videos ni nada que borrar fuera. */
export class DisabledVideoSigner implements VideoUploadSigner {
  readonly enabled = false;
  sign(): DirectUploadTicket {
    throw new Error("Cloudinary no está configurado.");
  }
  owns(): boolean {
    return false;
  }
  posterOf(src: string): string {
    return src;
  }
}

export class NoopMediaRemover implements MediaRemover {
  async remove(): Promise<void> {}
}
