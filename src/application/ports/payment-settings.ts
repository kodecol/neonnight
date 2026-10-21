export type PaymentMode = "pruebas" | "produccion";

/** Configuración de la pasarela Bold, editable desde el panel. */
export interface PaymentSettings {
  readonly enabled: boolean;
  readonly mode: PaymentMode;
  /** Llave de identidad (pública) de Bold. */
  readonly identityKey: string;
  /** Llave secreta de Bold. Nunca sale del servidor. */
  readonly secretKey: string;
  /**
   * Pedidos sin pasarela (Bold inactivo): se registra el pedido y se coordina
   * el pago con el cliente. Desactivado, el checkout avisa y no deja comprar.
   */
  readonly manual: { readonly enabled: boolean; readonly instructions: string };
  readonly updatedAt: Date | null;
}

export const DEFAULT_MANUAL_INSTRUCTIONS =
  "Recibimos tu pedido. Te escribimos por WhatsApp o correo en horario de atención para confirmar la pieza y coordinar el pago por transferencia o el medio que prefieras. La pieza no se descuenta del inventario hasta confirmar el pago.";

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: false,
  mode: "pruebas",
  identityKey: "",
  secretKey: "",
  manual: { enabled: true, instructions: DEFAULT_MANUAL_INSTRUCTIONS },
  updatedAt: null,
};

/** Cómo se cobra hoy: Bold, pedido manual o nada (el checkout avisa). */
export function paymentModeOf(s: PaymentSettings): "bold" | "manual" | "unavailable" {
  if (isPaymentReady(s)) return "bold";
  return s.manual.enabled ? "manual" : "unavailable";
}

/**
 * Llave con la que se verifican los webhooks de Bold, o null si hoy no se
 * acepta ninguno. Bold firma los de pruebas con una llave vacía, así que esa
 * llave solo vale con Bold activo en pruebas; con Bold apagado (pedidos
 * manuales) o sin llave secreta en producción, cualquiera podría firmar.
 */
export function webhookSecret(settings: PaymentSettings): string | null {
  if (!isPaymentReady(settings)) return null;
  return settings.mode === "pruebas" ? "" : settings.secretKey || null;
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
