import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import { EmptyCartError, PaymentsUnavailableError, ProductNotFoundError, ProductUnavailableError } from "@/domain/errors";
import { newOrderId, type Order, type OrderLine } from "@/domain/entities/order";
import { productDisplayName, type Product } from "@/domain/entities/product";
import { MAX_QUANTITY_PER_LINE, findVariant, isPurchasable } from "@/domain/services/availability";
import { Money } from "@/domain/value-objects/money";
import type { PaymentGateway } from "../ports/payment-gateway";
import { paymentModeOf, type PaymentSettingsRepository } from "../ports/payment-settings";
import type { Analytics } from "../ports/analytics";
import type { Clock, IdGenerator } from "../ports/clock";
import { FieldValidationError } from "../lib/errors";
import { CartLineInputSchema, CheckoutInputSchema, QuoteInputSchema, type CheckoutResultDto } from "../dto/cart.dto";
import type { CheckoutQuoteDto, LegalVersions } from "../dto/checkout.dto";
import type { SiteContentRepository } from "../ports/site-content-repository";

export interface CheckoutDeps {
  products: ProductRepository;
  orders: OrderRepository;
  payments: PaymentGateway;
  paymentSettings: PaymentSettingsRepository;
  analytics: Analytics;
  clock: Clock;
  ids: IdGenerator;
  /** Prefijo del número de pedido de la tienda ("NN-261021-…"). */
  orderPrefix: string;
}

/** El envío dentro de Colombia no tiene costo (ver /envios y `policies.shipping.free`). */
const SHIPPING = Money.zero();

/** Une líneas repetidas por variante y resuelve producto y variante en el servidor. */
async function resolveLines(products: ProductRepository, lines: ReadonlyArray<{ productId: string; variantId?: string; quantity: number }>) {
  const found = await products.findByIds(lines.map((l) => l.productId));
  const byId = new Map<string, Product>(found.map((p) => [p.id, p]));
  const merged = new Map<string, { product: Product; variantId: string; quantity: number }>();
  for (const l of lines) {
    const product = byId.get(l.productId);
    if (!product) throw new ProductNotFoundError(l.productId);
    const variant = findVariant(product, l.variantId);
    if (!variant) throw new ProductUnavailableError(product.slug.value, "no tiene esa presentación");
    const key = `${product.id}:${variant.id}`;
    const prev = merged.get(key);
    merged.set(key, { product, variantId: variant.id, quantity: (prev?.quantity ?? 0) + l.quantity });
  }
  return [...merged.values()].map(({ product, variantId, quantity }) => ({ product, variant: findVariant(product, variantId)!, quantity }));
}

const unavailableDetail = (product: Product, stock: number) =>
  product.availability === "disponible" && stock > 0 ? `solo tiene ${stock} ${stock === 1 ? "unidad" : "unidades"} disponibles` : "ya no está disponible";

/**
 * Resumen del pedido para /checkout con precios, stock y envío del servidor.
 * No lanza por una línea agotada: la marca para que el cliente la corrija.
 */
export class QuoteCheckout {
  constructor(private readonly products: ProductRepository) {}

  async execute(raw: unknown): Promise<CheckoutQuoteDto> {
    const { lines } = QuoteInputSchema.parse(raw);
    const valid = lines.map((l) => CartLineInputSchema.safeParse(l)).flatMap((r) => (r.success ? [r.data] : []));
    const found = await this.products.findByIds(valid.map((l) => l.productId));
    const byId = new Map<string, Product>(found.map((p) => [p.id, p]));
    const resolved = valid.flatMap((l) => {
      const product = byId.get(l.productId);
      const variant = product ? findVariant(product, l.variantId) : null;
      return product && variant ? [{ product, variant, quantity: l.quantity }] : [];
    });
    const out = resolved.map(({ product, variant, quantity }) => {
      const ok = isPurchasable(product, variant, quantity);
      const lineTotal = variant.price.multiply(quantity);
      return {
        productId: product.id,
        variantId: variant.id,
        variantLabel: variant.label,
        kind: product.specs.kind,
        slug: product.slug.value,
        name: productDisplayName(product),
        subtitle: product.subtitle,
        quantity,
        unitPrice: { cents: variant.price.cents, formatted: variant.price.format() },
        lineTotal: { cents: lineTotal.cents, formatted: lineTotal.format() },
        problem: ok ? null : `${productDisplayName(product)} ${unavailableDetail(product, variant.stock)}.`,
        maxQuantity: Math.max(0, Math.min(MAX_QUANTITY_PER_LINE, variant.stock)),
      };
    });
    const subtotal = resolved.reduce((acc, l) => acc.add(l.variant.price.multiply(l.quantity)), Money.zero());
    const total = subtotal.add(SHIPPING);
    return {
      lines: out,
      subtotal: { cents: subtotal.cents, formatted: subtotal.format() },
      shipping: { cents: SHIPPING.cents, formatted: SHIPPING.format(), label: SHIPPING.cents === 0 ? "Sin costo · asegurado" : SHIPPING.format() },
      total: { cents: total.cents, formatted: total.format() },
      ready: out.length > 0 && out.every((l) => l.problem === null),
    };
  }
}

/**
 * Recalcula el total en el servidor, valida disponibilidad, stock y la
 * aceptación de la versión vigente de los términos y la política de
 * privacidad, guarda la orden con los datos del comprador y abre el pago:
 * Bold si está activo; si no, pedido manual (si el panel lo permite).
 * El importe del cliente solo sirve para avisar de un cambio de precio.
 */
export class Checkout {
  constructor(private readonly deps: CheckoutDeps) {}

  async execute(rawInput: unknown, opts: { returnUrl: string; legal: LegalVersions }): Promise<CheckoutResultDto> {
    const input = CheckoutInputSchema.parse(rawInput);
    if (input.lines.length === 0) throw new EmptyCartError();
    if (input.consent.termsVersion !== opts.legal.terms.version || input.consent.privacyVersion !== opts.legal.privacy.version) {
      throw new FieldValidationError("consent", "Los términos o la política de privacidad se actualizaron. Revísalos y acepta de nuevo.");
    }

    const mode = paymentModeOf(await this.deps.paymentSettings.get());
    if (mode === "unavailable") throw new PaymentsUnavailableError();

    const orderLines: OrderLine[] = (await resolveLines(this.deps.products, input.lines)).map(({ product, variant, quantity }) => {
      if (!isPurchasable(product, variant, quantity)) throw new ProductUnavailableError(product.slug.value, unavailableDetail(product, variant.stock));
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

    const subtotal = orderLines.reduce((acc, l) => acc.add(l.unitPrice.multiply(l.quantity)), Money.zero());
    const total = subtotal.add(SHIPPING);
    const priceChanged = input.expectedTotalCents !== undefined && input.expectedTotalCents !== total.cents;
    const now = this.deps.clock.now();

    const order: Order = {
      id: newOrderId(now, this.deps.ids.next(), this.deps.orderPrefix),
      lines: orderLines,
      total,
      shipping: SHIPPING,
      status: "pendiente",
      createdAt: now,
      paymentReference: null,
      paymentMethod: mode,
      customer: { ...input.customer },
      consent: { termsVersion: input.consent.termsVersion, privacyVersion: input.consent.privacyVersion, acceptedAt: now },
      deletedAt: null,
      events: [{ at: now, type: "creado", by: "cliente" }],
      review: null,
    };

    let redirectUrl: string;
    let saved: Order;
    if (mode === "bold") {
      const session = await this.deps.payments.createSession(order, opts.returnUrl);
      saved = { ...order, status: session.status, paymentReference: session.reference };
      redirectUrl = session.redirectUrl;
    } else {
      const url = new URL(opts.returnUrl);
      url.searchParams.set("orden", order.id);
      saved = order;
      redirectUrl = url.toString();
    }
    await this.deps.orders.save(saved);

    await this.deps.analytics.track({ name: "begin_checkout", orderId: order.id, totalCents: total.cents, itemCount: orderLines.reduce((n, l) => n + l.quantity, 0) });

    return {
      orderId: order.id,
      status: saved.status === "cancelada" ? "fallida" : saved.status,
      paymentMethod: mode,
      total: { cents: total.cents, formatted: total.format() },
      redirectUrl,
      priceChanged,
    };
  }
}

/** Versión vigente de los términos y de la política de privacidad (lo que el cliente acepta). */
export class GetLegalVersions {
  constructor(private readonly content: SiteContentRepository) {}

  async execute(): Promise<LegalVersions> {
    const [terms, privacy] = await Promise.all([this.content.page("terminos"), this.content.page("privacidad")]);
    if (!terms || !privacy) throw new Error("Faltan los términos o la política de privacidad.");
    return { terms: { version: terms.version, updatedAt: terms.updatedAt }, privacy: { version: privacy.version, updatedAt: privacy.updatedAt } };
  }
}
