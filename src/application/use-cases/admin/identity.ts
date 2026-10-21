import type { Clock } from "../../ports/clock";
import type { MediaUploader } from "../../ports/media-uploader";
import { parseSaveMode, type SaveMode } from "../../lib/save-mode";
import type { SiteContent } from "../../dto/site-content.dto";
import { StoreIdentitySchema, type StoreIdentityInput } from "../../dto/identity.dto";
import { identityOf, type IdentitySettingsRepository, type StoreIdentity } from "../../ports/identity-settings";
import { UploadBrandLogo } from "./brands";

const toInput = (s: StoreIdentityInput): StoreIdentityInput => ({
  name: s.name,
  wordmark: s.wordmark,
  tagline: s.tagline,
  description: s.description,
  isotype: s.isotype ? { ...s.isotype } : null,
  logo: s.logo ? { ...s.logo } : null,
});

export interface IdentityEditorState {
  /** Lo que el editor muestra: el borrador, lo publicado o la identidad del código. */
  input: StoreIdentityInput;
  /** La del código, para "volver a la identidad de fábrica". */
  factory: StoreIdentityInput;
  hasDraft: boolean;
  publishedAt: string | null;
  history: Array<{ at: string; input: StoreIdentityInput }>;
}

/** Estado del editor del panel › Identidad. `base`: el contenido del código. */
export class GetIdentityEditor {
  constructor(private readonly identity: IdentitySettingsRepository) {}

  async execute(base: SiteContent["brand"]): Promise<IdentityEditorState> {
    const [published, draft, history] = await Promise.all([this.identity.get(), this.identity.getDraft(), this.identity.history()]);
    const factory = identityOf(base);
    return {
      input: toInput(draft ?? published ?? factory),
      factory,
      hasDraft: draft !== null,
      publishedAt: published?.updatedAt.toISOString() ?? null,
      history: history.map((h) => ({ at: h.updatedAt.toISOString(), input: toInput(h) })),
    };
  }
}

/**
 * Guarda la identidad como borrador (vista previa) o la publica. Es también
 * el futuro `brand:apply` del CLI: recibe un objeto cualquiera, lo valida con
 * `StoreIdentitySchema` y lo escribe en settings/brand.
 */
export class SaveIdentity {
  constructor(private readonly deps: { identity: IdentitySettingsRepository; clock: Clock }) {}

  async execute(raw: unknown, mode: SaveMode = "publish"): Promise<StoreIdentity> {
    const target = parseSaveMode(mode);
    const identity: StoreIdentity = { ...StoreIdentitySchema.parse(raw), updatedAt: this.deps.clock.now() };
    if (target === "draft") await this.deps.identity.saveDraft(identity);
    else await this.deps.identity.publish(identity);
    return identity;
  }
}

/** `brand:apply`: publica una identidad desde un objeto validado (CLI, importación). */
export class ApplyIdentity {
  constructor(private readonly deps: { identity: IdentitySettingsRepository; clock: Clock }) {}

  execute(raw: unknown): Promise<StoreIdentity> {
    return new SaveIdentity(this.deps).execute(raw, "publish");
  }
}

export class DiscardIdentityDraft {
  constructor(private readonly identity: IdentitySettingsRepository) {}

  execute(): Promise<void> {
    return this.identity.discardDraft();
  }
}

/** Sube el isotipo o el logo horizontal (SVG revisado o PNG/WebP/AVIF transparente) a la carpeta de identidad. */
export class UploadIdentityAsset {
  constructor(private readonly uploader: MediaUploader) {}

  execute(file: { bytes: Uint8Array; contentType: string; filename: string; width: number; height: number }): Promise<{ src: string; ratio: number }> {
    return new UploadBrandLogo(this.uploader).execute(file);
  }
}
