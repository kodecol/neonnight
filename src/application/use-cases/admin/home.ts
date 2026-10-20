import { MediaInUseError } from "@/domain/errors";
import type { Clock, IdGenerator } from "../../ports/clock";
import type { MediaUploader } from "../../ports/media-uploader";
import { DEFAULT_HOME_SETTINGS, mediaInUse, type HomeSettings, type HomeSettingsRepository } from "../../ports/home-settings";
import type { DirectUploadTicket, MediaRemover, SiteMedia, SiteMediaRepository, VideoUploadSigner } from "../../ports/site-media";
import { FieldValidationError } from "../../lib/errors";
import {
  BAND_POSITIONS,
  HomeSettingsInputSchema,
  RegisterVideoSchema,
  SiteMediaAltSchema,
  type BandPosition,
  type HomeContentDto,
  type HomeEditorDefaults,
  type HomeSettingsInput,
  type SiteMediaDto,
} from "../../dto/home.dto";
import { UploadImage } from "./upload-image";
import type { SiteContent } from "../../dto/site-content.dto";
import { SOCIAL_KEYS } from "../../lib/social-networks";

export interface HomeDeps {
  siteMedia: SiteMediaRepository;
  homeSettings: HomeSettingsRepository;
}

const toDto = (m: SiteMedia, usedIn: string[] = []): SiteMediaDto => ({ id: m.id, kind: m.kind, src: m.src, alt: m.alt, width: m.width, height: m.height, poster: m.poster, usedIn });

/** Biblioteca del sitio con dónde se usa cada medio (lo más reciente primero). */
export class ListSiteMedia {
  constructor(private readonly deps: HomeDeps) {}

  async execute(): Promise<SiteMediaDto[]> {
    const [media, settings] = await Promise.all([this.deps.siteMedia.list(), this.deps.homeSettings.get()]);
    const uses = mediaInUse(settings);
    return [...media].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((m) => toDto(m, uses.get(m.id)));
  }
}

/** Sube una foto a la carpeta del sitio y la registra en la biblioteca. */
export class UploadSiteImage {
  constructor(private readonly deps: { siteMedia: SiteMediaRepository; uploader: MediaUploader; ids: IdGenerator; clock: Clock }) {}

  async execute(file: { bytes: Uint8Array; contentType: string; filename: string; width: number; height: number }): Promise<SiteMediaDto> {
    const stored = await new UploadImage(this.deps.uploader).execute(file);
    const media: SiteMedia = { id: `m-${this.deps.ids.next()}`, kind: "image", src: stored.src, alt: "", width: stored.width, height: stored.height, poster: null, createdAt: this.deps.clock.now() };
    await this.deps.siteMedia.save(media);
    return toDto(media);
  }
}

/** Firma para que el navegador suba un video directo a Cloudinary. */
export class RequestVideoUpload {
  constructor(private readonly signer: VideoUploadSigner) {}

  execute(): DirectUploadTicket {
    if (!this.signer.enabled) throw new FieldValidationError("file", "Los videos necesitan Cloudinary configurado.");
    return this.signer.sign();
  }
}

/** Registra en la biblioteca un video ya subido a Cloudinary (solo de nuestra cuenta y carpeta). */
export class RegisterSiteVideo {
  constructor(private readonly deps: { siteMedia: SiteMediaRepository; signer: VideoUploadSigner; ids: IdGenerator; clock: Clock }) {}

  async execute(raw: unknown): Promise<SiteMediaDto> {
    const input = RegisterVideoSchema.parse(raw);
    if (!this.deps.signer.owns(input.src)) throw new FieldValidationError("file", "El video no viene de la carpeta del sitio en Cloudinary.");
    const media: SiteMedia = {
      id: `m-${this.deps.ids.next()}`,
      kind: "video",
      src: input.src,
      alt: "",
      width: input.width,
      height: input.height,
      poster: this.deps.signer.posterOf(input.src),
      createdAt: this.deps.clock.now(),
    };
    await this.deps.siteMedia.save(media);
    return toDto(media);
  }
}

export class UpdateSiteMediaAlt {
  constructor(private readonly siteMedia: SiteMediaRepository) {}

  async execute(raw: unknown): Promise<void> {
    const { id, alt } = SiteMediaAltSchema.parse(raw);
    const media = await this.siteMedia.findById(id);
    if (!media) throw new FieldValidationError("id", "Ese medio ya no existe.");
    await this.siteMedia.save({ ...media, alt });
  }
}

/** Quita un medio de la biblioteca y del proveedor; si la home lo usa, no deja. */
export class DeleteSiteMedia {
  constructor(private readonly deps: HomeDeps & { remover: MediaRemover }) {}

  async execute(id: string): Promise<void> {
    const [media, settings] = await Promise.all([this.deps.siteMedia.findById(id), this.deps.homeSettings.get()]);
    if (!media) return;
    const where = mediaInUse(settings).get(id);
    if (where) throw new MediaInUseError(id, where);
    await this.deps.remover.remove(media.src, media.kind);
    await this.deps.siteMedia.delete(id);
  }
}

const positionKey = (position: string | null): BandPosition => (Object.entries(BAND_POSITIONS).find(([, v]) => v === position)?.[0] as BandPosition | undefined) ?? "centro";

export class GetHomeSettings {
  constructor(private readonly homeSettings: HomeSettingsRepository) {}

  /** `base`: el contenido del código, para mostrar en el editor los bloques que nunca se editaron. */
  async execute(base: SiteContent): Promise<HomeSettingsInput & { updatedAt: string | null; defaults: HomeEditorDefaults }> {
    const s = await this.homeSettings.get();
    const defaults: HomeEditorDefaults = {
      trust: s.trust
        ? { kicker: s.trust.kicker, items: s.trust.items.map((i) => ({ ...i })) }
        : { kicker: null, items: base.home.trust.items.map(({ title, body }) => ({ title, body })) },
      testimonials: s.testimonials
        ? { ...s.testimonials, items: s.testimonials.items.map((t) => ({ ...t })) }
        : {
            kicker: null,
            title: null,
            note: null,
            // Los del código son de ejemplo: entran sin autorización hasta que se confirme cada uno.
            items: base.home.testimonials.items.map((t, i) => ({ id: `ejemplo-${i + 1}`, ...t, authorized: false, visible: true })),
          },
      social: s.social
        ? { ...s.social, networks: s.social.networks.map((n) => ({ ...n })) }
        : {
            kicker: null,
            title: null,
            body: null,
            networks: SOCIAL_KEYS.map((id) => {
              const n = base.social.networks.find((x) => x.id === id);
              return { id, enabled: Boolean(n), handle: n?.handle ?? "", href: n?.href ?? "", description: n?.description ?? "" };
            }),
          },
    };
    return {
      hero: { ...s.hero },
      band: { mediaId: s.band.mediaId, title: s.band.title, position: positionKey(s.band.position) },
      trust: s.trust ? defaults.trust : null,
      testimonials: s.testimonials ? defaults.testimonials : null,
      social: s.social ? defaults.social : null,
      updatedAt: s.updatedAt?.toISOString() ?? null,
      defaults,
    };
  }
}

/** Guarda el contenido de la home: los medios elegidos deben existir y ser del tipo correcto. */
export class SaveHomeSettings {
  constructor(private readonly deps: HomeDeps & { clock: Clock }) {}

  async execute(raw: unknown): Promise<void> {
    const input = HomeSettingsInputSchema.parse(raw);
    const heroMedia = input.hero.source === "media" && input.hero.mediaId ? await this.deps.siteMedia.findById(input.hero.mediaId) : null;
    if (input.hero.source === "media" && !heroMedia) throw new FieldValidationError("hero.mediaId", "La foto o el video del hero ya no está en la biblioteca.");
    if (input.band.mediaId) {
      const band = await this.deps.siteMedia.findById(input.band.mediaId);
      if (!band) throw new FieldValidationError("band.mediaId", "La foto de la banda ya no está en la biblioteca.");
      if (band.kind !== "image") throw new FieldValidationError("band.mediaId", "La banda lleva una foto, no un video.");
    }
    const settings: HomeSettings = {
      hero: { ...input.hero, mediaId: input.hero.source === "media" ? input.hero.mediaId : null },
      band: { mediaId: input.band.mediaId, title: input.band.title, position: BAND_POSITIONS[input.band.position] },
      trust: input.trust,
      testimonials: input.testimonials,
      social: input.social,
      updatedAt: this.deps.clock.now(),
    };
    await this.deps.homeSettings.save(settings);
  }
}

/** Lo que la home toma del panel; lo que falte sigue los textos por defecto. */
export class GetHomeContent {
  constructor(private readonly deps: HomeDeps) {}

  async execute(defaults: { kicker: string; cta: string }): Promise<HomeContentDto> {
    const s = await this.deps.homeSettings.get().catch(() => DEFAULT_HOME_SETTINGS);
    const [heroMedia, bandMedia] = await Promise.all([
      s.hero.source === "media" && s.hero.mediaId ? this.deps.siteMedia.findById(s.hero.mediaId) : null,
      s.band.mediaId ? this.deps.siteMedia.findById(s.band.mediaId) : null,
    ]);
    const hero =
      heroMedia && s.hero.title
        ? {
            media:
              heroMedia.kind === "video"
                ? { kind: "video" as const, video: { src: heroMedia.src, poster: heroMedia.poster ?? "" } }
                : { kind: "image" as const, image: { src: heroMedia.src, alt: heroMedia.alt, width: heroMedia.width, height: heroMedia.height } },
            kicker: s.hero.kicker ?? defaults.kicker,
            title: s.hero.title,
            text: s.hero.text,
            cta: s.hero.ctaHref ? { label: s.hero.ctaLabel ?? defaults.cta, href: s.hero.ctaHref } : null,
          }
        : null;
    const band =
      bandMedia && bandMedia.kind === "image"
        ? { image: { src: bandMedia.src, alt: bandMedia.alt, width: bandMedia.width, height: bandMedia.height, position: s.band.position ?? undefined }, title: s.band.title }
        : null;
    return { hero, band };
  }
}
