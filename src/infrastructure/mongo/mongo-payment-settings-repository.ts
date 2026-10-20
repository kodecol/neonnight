import { DEFAULT_PAYMENT_SETTINGS, type PaymentMode, type PaymentSettings, type PaymentSettingsRepository } from "@/application/ports/payment-settings";
import { open, seal } from "../security/secret-box";
import type { DbProvider } from "./client";

interface SettingsDoc {
  _id: "payments";
  provider: "bold";
  enabled: boolean;
  mode: PaymentMode;
  identityKey: string;
  /** Llave secreta cifrada con AES-256-GCM (ver secret-box.ts). */
  secretKeySealed: string | null;
  updatedAt: Date;
}

export class MongoPaymentSettingsRepository implements PaymentSettingsRepository {
  constructor(
    private readonly db: DbProvider,
    private readonly secret: () => string | null,
  ) {}

  private async col() {
    return (await this.db()).collection<SettingsDoc>("settings");
  }

  async get(): Promise<PaymentSettings> {
    const d = await (await this.col()).findOne({ _id: "payments" });
    if (!d) return DEFAULT_PAYMENT_SETTINGS;
    const secret = this.secret();
    const secretKey = d.secretKeySealed && secret ? (open(d.secretKeySealed, secret) ?? "") : "";
    return { enabled: d.enabled, mode: d.mode, identityKey: d.identityKey, secretKey, updatedAt: d.updatedAt };
  }

  async save(s: PaymentSettings): Promise<void> {
    const secret = this.secret();
    if (s.secretKey && !secret) throw new Error("ADMIN_SECRET (32+ caracteres) es obligatorio para guardar la llave secreta.");
    const doc: SettingsDoc = {
      _id: "payments",
      provider: "bold",
      enabled: s.enabled,
      mode: s.mode,
      identityKey: s.identityKey,
      secretKeySealed: s.secretKey && secret ? seal(s.secretKey, secret) : null,
      updatedAt: s.updatedAt ?? new Date(),
    };
    await (await this.col()).replaceOne({ _id: "payments" }, doc, { upsert: true });
  }
}
