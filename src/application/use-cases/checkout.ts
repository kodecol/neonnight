import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import { EmptyCartError, ProductNotFoundError, ProductUnavailableError } from "@/domain/errors";
import { orderId, type Order, type OrderLine } from "@/domain/entities/order";
import { productDisplayName, type Product } from "@/domain/entities/product";
import { findVariant, isPurchasable } from "@/domain/services/availability";
import { Money } from "@/domain/value-objects/money";
import type { PaymentGateway } from "../ports/payment-gateway";
import type { Analytics } from "../ports/analytics";
import type { Clock, IdGenerator } from "../ports/clock";
import { CheckoutInputSchema, type CheckoutResultDto } from "../dto/cart.dto";

export interface CheckoutDeps {
  products: ProductRepository;
  orders: OrderRepository;
  payments: PaymentGateway;
  analytics: Analytics;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Recalcula el total en el servidor, valida disponibilidad y stock, crea la
 * orden y abre la sesión de pago. El importe del cliente solo sirve para
 * avisar de un cambio de precio (`priceChanged`), nunca para cobrar.
 */
export class Checkout {
  constructor(private readonly deps: CheckoutDeps) {}

  async execute(rawInput: unknown, returnUrl: string): Promise<CheckoutResultDto> {
    const input = CheckoutInputSchema.parse(rawInput);
    if (input.lines.length === 0) throw new EmptyCartError();

    const products = await this.deps.products.findByIds(input.lines.map((l) => l.productId));
    const byId = new Map<string, Product>(products.map((p) => [p.id, p]));

    // Una línea por variante aunque el cliente la mande repetida.
    const merged = new Map<string, { product: Product; variantId: string; quantity: number }>();
    for (const l of input.lines) {
      const product = byId.get(l.productId);
      if (!product) throw new ProductNotFoundError(l.productId);
      const variant = findVariant(product, l.variantId);
      if (!variant) throw new ProductUnavailableError(product.slug.value, "no tiene esa presentación");
      const key = `${product.id}:${variant.id}`;
      const prev = merged.get(key);
      merged.set(key, { product, variantId: variant.id, quantity: (prev?.quantity ?? 0) + l.quantity });
    }

    const orderLines: OrderLine[] = [...merged.values()].map(({ product, variantId, quantity }) => {
      const variant = findVariant(product, variantId)!;
      if (!isPurchasable(product, variant, quantity)) {
        const detail =
          product.availability === "disponible" && variant.stock > 0
            ? `solo tiene ${variant.stock} ${variant.stock === 1 ? "unidad" : "unidades"} disponibles`
            : "ya no está disponible";
        throw new ProductUnavailableError(product.slug.value, detail);
      }
      return {
        productId: product.id,
        variantId: variant.id,
        variantLabel: variant.label,
        slug: product.slug.value,
        name: productDisplayName(product),
        unitPrice: variant.price,
        quantity,
      };
    });

    const total = orderLines.reduce((acc, l) => acc.add(l.unitPrice.multiply(l.quantity)), Money.zero());
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
