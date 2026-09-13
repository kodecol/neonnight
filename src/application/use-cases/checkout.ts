import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import { EmptyCartError, WatchNotFoundError, WatchUnavailableError } from "@/domain/errors";
import { orderId, type Order, type OrderLine } from "@/domain/entities/order";
import { watchDisplayName, watchId, type Watch } from "@/domain/entities/watch";
import type { CartLine } from "@/domain/entities/cart-line";
import { isPurchasable } from "@/domain/services/availability";
import { cartTotal } from "@/domain/services/pricing";
import type { PaymentGateway } from "../ports/payment-gateway";
import type { Analytics } from "../ports/analytics";
import type { Clock, IdGenerator } from "../ports/clock";
import { CheckoutInputSchema, type CheckoutResultDto } from "../dto/cart.dto";

export interface CheckoutDeps {
  watches: WatchRepository;
  orders: OrderRepository;
  payments: PaymentGateway;
  analytics: Analytics;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Recalcula el total en el servidor, valida disponibilidad, crea la orden y
 * abre la sesión de pago. El importe del cliente solo sirve para avisar de
 * un cambio de precio (`priceChanged`), nunca para cobrar.
 */
export class Checkout {
  constructor(private readonly deps: CheckoutDeps) {}

  async execute(rawInput: unknown, returnUrl: string): Promise<CheckoutResultDto> {
    const input = CheckoutInputSchema.parse(rawInput);
    if (input.lines.length === 0) throw new EmptyCartError();

    const watches = await this.deps.watches.findByIds(input.lines.map((l) => l.watchId));
    const byId = new Map<string, Watch>(watches.map((w) => [w.id, w]));

    const orderLines: OrderLine[] = input.lines.map((l) => {
      const w = byId.get(l.watchId);
      if (!w) throw new WatchNotFoundError(l.watchId);
      if (!isPurchasable(w)) throw new WatchUnavailableError(w.slug.value);
      return { watchId: w.id, slug: w.slug.value, name: watchDisplayName(w), unitPrice: w.price, quantity: l.quantity };
    });

    const cartLines: CartLine[] = input.lines.map((l) => ({ watchId: watchId(l.watchId), quantity: l.quantity }));
    const total = cartTotal(cartLines, byId);
    const priceChanged = input.expectedTotalCents !== undefined && input.expectedTotalCents !== total.cents;

    const order: Order = {
      id: orderId(this.deps.ids.next()),
      lines: orderLines,
      total,
      status: "pendiente",
      createdAt: this.deps.clock.now(),
      paymentReference: null,
    };

    const session = await this.deps.payments.createSession(order, returnUrl);
    await this.deps.orders.save({ ...order, status: session.status, paymentReference: session.reference });

    await this.deps.analytics.track({
      name: "begin_checkout",
      orderId: order.id,
      totalCents: total.cents,
      itemCount: orderLines.reduce((n, l) => n + l.quantity, 0),
    });

    return {
      orderId: order.id,
      status: session.status,
      total: { cents: total.cents, formatted: total.format() },
      redirectUrl: session.redirectUrl,
      priceChanged,
    };
  }
}
