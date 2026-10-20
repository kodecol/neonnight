import type { Clock } from "../../ports/clock";
import { isPaymentReady, type PaymentSettings, type PaymentSettingsRepository } from "../../ports/payment-settings";
import { FieldValidationError } from "../../lib/errors";
import { PaymentSettingsInputSchema, type PaymentSettingsViewDto } from "../../dto/admin.dto";

export function toPaymentSettingsView(s: PaymentSettings): PaymentSettingsViewDto {
  return {
    enabled: s.enabled,
    mode: s.mode,
    identityKey: s.identityKey,
    secretKeyHint: s.secretKey ? `••••${s.secretKey.slice(-4)}` : null,
    ready: isPaymentReady(s),
    updatedAt: s.updatedAt?.toISOString() ?? null,
  };
}

export class GetPaymentSettings {
  constructor(private readonly settings: PaymentSettingsRepository) {}

  async execute(): Promise<PaymentSettingsViewDto> {
    return toPaymentSettingsView(await this.settings.get());
  }
}

export class SavePaymentSettings {
  constructor(private readonly deps: { settings: PaymentSettingsRepository; clock: Clock }) {}

  async execute(raw: unknown): Promise<PaymentSettingsViewDto> {
    const input = PaymentSettingsInputSchema.parse(raw);
    const prev = await this.deps.settings.get();
    const next: PaymentSettings = {
      enabled: input.enabled,
      mode: input.mode,
      identityKey: input.identityKey,
      secretKey: input.secretKey || prev.secretKey,
      updatedAt: this.deps.clock.now(),
    };
    if (next.enabled && !next.identityKey) throw new FieldValidationError("identityKey", "La llave de identidad es obligatoria para activar Bold.");
    if (next.enabled && next.mode === "produccion" && !next.secretKey) {
      throw new FieldValidationError("secretKey", "En producción la llave secreta es obligatoria.");
    }
    await this.deps.settings.save(next);
    return toPaymentSettingsView(next);
  }
}
