import { createHash } from "node:crypto";
import type { Clock } from "../../ports/clock";
import type { CompanySettingsRepository } from "../../ports/company-settings";
import type { HomeSettingsRepository, SocialNetworkKey } from "../../ports/home-settings";
import type { IdentitySettingsRepository } from "../../ports/identity-settings";
import type { AppearanceSettingsRepository } from "../../ports/appearance-settings";
import { SOCIAL_NETWORKS } from "../../lib/social-networks";
import { BrandConfigSchema, brandAppearance, brandCompany, brandIdentity, type BrandConfig } from "../../dto/brand-config.dto";
import type { StoreIdentityInput } from "../../dto/identity.dto";
import { StoreAppearanceSchema } from "../../dto/appearance.dto";
import { CompanyInputSchema } from "../../dto/legal.dto";
import { ApplyIdentity } from "./identity";
import { ApplyAppearance } from "./appearance";
import { SaveCompanySettings } from "./legal";

/** Huella de lo aplicado: si el brand.json no cambió, brand:apply no vuelve a publicar nada. */
export interface BrandFingerprintStore {
  get(): Promise<string | null>;
  set(hash: string): Promise<void>;
}

interface Deps {
  identity: IdentitySettingsRepository;
  appearance: AppearanceSettingsRepository;
  companySettings: CompanySettingsRepository;
  homeSettings: HomeSettingsRepository;
  fingerprint: BrandFingerprintStore;
  clock: Clock;
  /** Resuelve `isotipo_url` / `logo_url` a medios de la instancia (descarga y sube; o rutas del sitio tal cual). */
  resolveAsset: (ref: string, alt: string) => Promise<NonNullable<StoreIdentityInput["isotype"]>>;
}

const NETWORK_COPY: Record<SocialNetworkKey, string> = {
  instagram: "Llegadas nuevas y detalles de cada pieza",
  facebook: "Novedades y lo que pasa detrás de cámaras",
  tiktok: "Videos cortos de las piezas en uso",
  youtube: "Reseñas y verificaciones paso a paso",
};

/** `https://www.instagram.com/joyeria.aurora/` → `@joyeria.aurora` (en YouTube y Facebook, sin @). */
function handleOf(id: SocialNetworkKey, href: string): string {
  const seg = new URL(href).pathname.split("/").filter(Boolean).pop() ?? "";
  const clean = decodeURIComponent(seg).replace(/^@/, "").slice(0, 38);
  return id === "instagram" || id === "tiktok" ? `@${clean}` : clean;
}

export type BrandApplyResult = { status: "aplicada" | "sin-cambios"; fingerprint: string; applied: string[] };

/**
 * `brand:apply`: escribe un brand.json validado en Identidad, Apariencia,
 * Legales (datos de la empresa) y las redes de la home, como publicaciones
 * normales (quedan en el historial y se editan luego en el panel).
 * Idempotente: el mismo archivo no vuelve a publicar ni a subir imágenes.
 */
export class ApplyBrandConfig {
  constructor(private readonly deps: Deps) {}

  async execute(raw: unknown, opts: { force?: boolean } = {}): Promise<BrandApplyResult> {
    const brand: BrandConfig = BrandConfigSchema.parse(raw);
    const fingerprint = createHash("sha256").update(JSON.stringify(brand)).digest("hex").slice(0, 16);
    if (!opts.force && (await this.deps.fingerprint.get()) === fingerprint) return { status: "sin-cambios", fingerprint, applied: [] };

    // Valida apariencia y empresa ANTES de subir imágenes o publicar nada.
    const appearance = brandAppearance(brand);
    const company = brandCompany(brand);
    StoreAppearanceSchema.parse(appearance);
    CompanyInputSchema.parse(company);

    const isotype = brand.isotipo_url ? await this.deps.resolveAsset(brand.isotipo_url, `Isotipo de ${brand.name}`) : null;
    const logo = brand.logo_url ? await this.deps.resolveAsset(brand.logo_url, brand.name) : null;
    const lightLogo = brand.logo_light_url ? await this.deps.resolveAsset(brand.logo_light_url, brand.name) : null;
    const { clock } = this.deps;
    await new ApplyIdentity({ identity: this.deps.identity, clock }).execute(brandIdentity(brand, { isotype, logo, lightLogo }));
    await new ApplyAppearance({ appearance: this.deps.appearance, clock }).execute(appearance);
    await new SaveCompanySettings({ companySettings: this.deps.companySettings, clock }).execute(company);
    const applied = ["identidad", "apariencia", "empresa"];

    if (brand.social) {
      const home = await this.deps.homeSettings.get();
      const networks = (Object.keys(SOCIAL_NETWORKS) as SocialNetworkKey[]).map((id) => {
        const href = brand.social?.[id] ?? "";
        return { id, enabled: Boolean(href), handle: href ? handleOf(id, href) : "", href, description: NETWORK_COPY[id] };
      });
      await this.deps.homeSettings.publish({ ...home, social: { kicker: null, title: null, body: null, networks }, updatedAt: clock.now() });
      applied.push("redes");
    }
    await this.deps.fingerprint.set(fingerprint);
    return { status: "aplicada", fingerprint, applied };
  }
}
