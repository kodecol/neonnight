export type PaymentMode = "pruebas" | "produccion";

/** Configuración de la pasarela Bold, editable desde el panel. */
export interface PaymentSettings {
  readonly enabled: boolean;
  readonly mode: PaymentMode;
  /** Llave de identidad (pública) de Bold. */
  readonly identityKey: string;
  /** Llave secreta de Bold. Nunca sale del servidor. */
  readonly secretKey: string;
  readonly updatedAt: Date | null;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: false,
  mode: "pruebas",
  identityKey: "",
  secretKey: "",
  updatedAt: null,
};

/** Bold firma los webhooks de pruebas con una llave vacía. */
export function webhookSecret(settings: PaymentSettings): string {
  return settings.mode === "pruebas" ? "" : settings.secretKey;
}

/** Bold está listo para cobrar: activo y con las llaves que exige el modo. */
export function isPaymentReady(settings: PaymentSettings): boolean {
  if (!settings.enabled || settings.identityKey.length === 0) return false;
  return settings.mode === "pruebas" || settings.secretKey.length > 0;
}

export interface PaymentSettingsRepository {
  get(): Promise<PaymentSettings>;
  save(settings: PaymentSettings): Promise<void>;
}
