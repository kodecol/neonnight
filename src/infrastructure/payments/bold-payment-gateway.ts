import { PAYMENT_LINK_TTL_MS, type Order } from "@/domain/entities/order";
import type { PaymentGateway, PaymentSession } from "@/application/ports/payment-gateway";
import { isPaymentReady, type PaymentSettingsRepository } from "@/application/ports/payment-settings";

export const BOLD_API_URL = "https://integrations.api.bold.co";
/** El panel avisa al eliminar un pedido con link quizá vigente: misma constante. */
const LINK_TTL_MS = PAYMENT_LINK_TTL_MS;

interface BoldLinkResponse {
  payload?: { payment_link?: string; url?: string };
  errors?: unknown[];
}

export class BoldGatewayError extends Error {}

/**
 * Pasarela Bold vía API de Links de pago: crea un link cerrado por el total
 * de la orden y redirige al cliente a `checkout.bold.co`. La confirmación
 * llega por webhook (`/api/webhooks/bold`).
 * Si Bold no está activo en el panel, delega en `fallback` (flujo sin cobro).
 */
export class BoldPaymentGateway implements PaymentGateway {
  constructor(
    private readonly settings: PaymentSettingsRepository,
    private readonly fallback: PaymentGateway,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async createSession(order: Order, returnUrl: string): Promise<PaymentSession> {
    const s = await this.settings.get();
    if (!isPaymentReady(s)) return this.fallback.createSession(order, returnUrl);

    const callback = new URL(returnUrl);
    callback.searchParams.set("orden", order.id);
    const names = order.lines.map((l) => l.name).join(", ");
    const body = {
      amount_type: "CLOSE",
      amount: { currency: order.total.currency, total_amount: order.total.units, tip_amount: 0, taxes: [] },
      reference: order.id,
      description: `Pedido ${order.id} · ${names}`.slice(0, 100),
      expiration_date: (this.now() + LINK_TTL_MS) * 1_000_000,
      // Bold solo acepta callbacks HTTPS; en local se omite.
      ...(callback.protocol === "https:" ? { callback_url: callback.toString() } : {}),
    };

    const res = await this.fetchImpl(`${BOLD_API_URL}/online/link/v1`, {
      method: "POST",
      headers: { Authorization: `x-api-key ${s.identityKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      // Si Bold no responde, el checkout avisa en vez de quedarse colgado.
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as BoldLinkResponse;
    const url = json.payload?.url;
    const link = json.payload?.payment_link;
    if (!res.ok || !url || !link) {
      throw new BoldGatewayError(`Bold rechazó el link (${res.status}): ${JSON.stringify(json.errors ?? json)}`);
    }
    return { reference: link, redirectUrl: url, status: "pendiente" };
  }
}
