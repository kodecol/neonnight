import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { PaymentGateway } from "@/application/ports/payment-gateway";
import type { Analytics } from "@/application/ports/analytics";
import type { WhatsAppLinkBuilder } from "@/application/ports/whatsapp-link-builder";
import type { Clock, IdGenerator } from "@/application/ports/clock";
import { InMemoryWatchRepository } from "./repositories/in-memory-watch-repository";
import { InMemoryOrderRepository } from "./repositories/in-memory-order-repository";
import { NoopPaymentGateway } from "./payments/noop-payment-gateway";
import { ConsoleAnalytics } from "./analytics/console-analytics";
import { WaMeLinkBuilder } from "./whatsapp/wa-me-link-builder";
import { RandomIdGenerator, SystemClock } from "./system";
import { SEED_WATCHES } from "./cms/seed";

/**
 * Contenedor tipado y explícito. Sin framework de DI.
 * Funciona igual en server components, route handlers y tests:
 *   createContainer({ watches: new InMemoryWatchRepository([...]) })
 */
export interface Container {
  watches: WatchRepository;
  orders: OrderRepository;
  payments: PaymentGateway;
  analytics: Analytics;
  whatsapp: WhatsAppLinkBuilder;
  clock: Clock;
  ids: IdGenerator;
}

let container: Container | null = null;

export function createContainer(overrides: Partial<Container> = {}): Container {
  return {
    watches: overrides.watches ?? new InMemoryWatchRepository(SEED_WATCHES),
    orders: overrides.orders ?? new InMemoryOrderRepository(),
    payments: overrides.payments ?? new NoopPaymentGateway(),
    analytics: overrides.analytics ?? new ConsoleAnalytics(),
    whatsapp: overrides.whatsapp ?? new WaMeLinkBuilder(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
    clock: overrides.clock ?? new SystemClock(),
    ids: overrides.ids ?? new RandomIdGenerator(),
  };
}

export function getContainer(): Container {
  return (container ??= createContainer());
}

/** Solo para tests. */
export function resetContainer(): void {
  container = null;
}
