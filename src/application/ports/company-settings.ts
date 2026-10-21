import type { CompanyInfo, StorePolicies } from "../dto/site-content.dto";

/** Datos de la empresa editados en el panel › Legales. Sin guardar: los del código. */
export interface CompanySettings {
  readonly tradeName: string;
  readonly legalForm: string;
  readonly registryNumber: string;
  readonly chamber: string;
  readonly ownerName: string | null;
  readonly ownerTaxId: string | null;
  readonly city: string;
  readonly region: string;
  readonly email: string;
  readonly privacyEmail: string;
  readonly hours: string;
  /** Transportadora y página de rastreo (null: las del código). */
  readonly carrier: string | null;
  readonly trackingUrl: string | null;
  readonly updatedAt: Date;
}

export interface CompanySettingsRepository {
  get(): Promise<CompanySettings | null>;
  save(settings: CompanySettings): Promise<void>;
}

/** La identidad que usa el sitio: la del código con lo editado encima. */
export function mergeCompany(base: CompanyInfo, s: CompanySettings | null): CompanyInfo {
  if (!s) return base;
  return {
    ...base,
    tradeName: s.tradeName,
    legalForm: s.legalForm,
    registry: { chamber: s.chamber, number: s.registryNumber },
    owner: s.ownerName && s.ownerTaxId ? { name: s.ownerName, taxId: s.ownerTaxId } : undefined,
    city: s.city,
    region: s.region,
    email: s.email,
    privacyEmail: s.privacyEmail,
    hours: s.hours,
  };
}

/** Transportadora editada sobre las políticas del código (los plazos no se tocan). */
export function mergeShipping(base: StorePolicies, s: CompanySettings | null): StorePolicies {
  if (!s?.carrier && !s?.trackingUrl) return base;
  return { ...base, shipping: { ...base.shipping, carrier: s.carrier ?? base.shipping.carrier, trackingUrl: s.trackingUrl ?? base.shipping.trackingUrl } };
}
