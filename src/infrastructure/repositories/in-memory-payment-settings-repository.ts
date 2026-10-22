import { DomainError } from "@/domain/errors";
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

/** Demo host: Bold siempre apagado y el panel no puede guardar llaves (las demos no cobran). */
export class DemoPaymentSettingsRepository implements PaymentSettingsRepository {
  async get(): Promise<PaymentSettings> {
    return { ...DEFAULT_PAYMENT_SETTINGS, enabled: false };
  }

  async save(): Promise<void> {
    throw new DomainError("En una demo no se configuran pagos: los pedidos quedan como pedido manual.");
  }
}
