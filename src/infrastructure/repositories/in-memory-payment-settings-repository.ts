import { DEFAULT_PAYMENT_SETTINGS, type PaymentSettings, type PaymentSettingsRepository } from "@/application/ports/payment-settings";

export class InMemoryPaymentSettingsRepository implements PaymentSettingsRepository {
  constructor(private settings: PaymentSettings = DEFAULT_PAYMENT_SETTINGS) {}

  async get(): Promise<PaymentSettings> {
    return this.settings;
  }

  async save(settings: PaymentSettings): Promise<void> {
    this.settings = settings;
  }
}
