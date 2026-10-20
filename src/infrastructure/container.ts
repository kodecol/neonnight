import type { WatchRepository } from "@/domain/repositories/watch-repository";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { PaymentGateway } from "@/application/ports/payment-gateway";
import type { PaymentSettingsRepository } from "@/application/ports/payment-settings";
import type { MediaUploader } from "@/application/ports/media-uploader";
import type { Analytics } from "@/application/ports/analytics";
import type { WhatsAppLinkBuilder } from "@/application/ports/whatsapp-link-builder";
import type { Clock, IdGenerator } from "@/application/ports/clock";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import { InMemoryWatchRepository } from "./repositories/in-memory-watch-repository";
import { InMemoryOrderRepository } from "./repositories/in-memory-order-repository";
import { InMemoryCategoryRepository } from "./repositories/in-memory-category-repository";
import { InMemoryPaymentSettingsRepository } from "./repositories/in-memory-payment-settings-repository";
import { mongoDb } from "./mongo/client";
import { MongoWatchRepository } from "./mongo/mongo-watch-repository";
import { MongoOrderRepository } from "./mongo/mongo-order-repository";
import { MongoCategoryRepository } from "./mongo/mongo-category-repository";
import { MongoPaymentSettingsRepository } from "./mongo/mongo-payment-settings-repository";
import { NoopPaymentGateway } from "./payments/noop-payment-gateway";
import { BoldPaymentGateway } from "./payments/bold-payment-gateway";
import { LocalDiskMediaUploader } from "./media/local-disk-uploader";
import { CloudinaryMediaUploader } from "./media/cloudinary-uploader";
import { adminSecret } from "./auth/session";
import { ConsoleAnalytics } from "./analytics/console-analytics";
import { WaMeLinkBuilder } from "./whatsapp/wa-me-link-builder";
import { RandomIdGenerator, SystemClock } from "./system";
import { SEED_CATEGORIES, SEED_WATCHES } from "./cms/seed";
import { SITE_CONTENT } from "./content/site-content";
import { StaticSiteContentRepository } from "./content/static-site-content-repository";

/**
 * Contenedor tipado y explícito. Sin framework de DI.
 * Funciona igual en server components, route handlers y tests:
 *   createContainer({ watches: new InMemoryWatchRepository([...]) })
 *
 * Con MONGODB_URI los repositorios son de Mongo; sin ella, en memoria
 * (tests, e2e y desarrollo sin base). Con CLOUDINARY_URL las fotos van a
 * Cloudinary; sin ella, a disco local.
 */
export interface Container {
  watches: WatchRepository;
  categories: CategoryRepository;
  orders: OrderRepository;
  paymentSettings: PaymentSettingsRepository;
  payments: PaymentGateway;
  media: MediaUploader;
  analytics: Analytics;
  whatsapp: WhatsAppLinkBuilder;
  clock: Clock;
  ids: IdGenerator;
  content: SiteContentRepository;
}

/**
 * En producción vive en globalThis: un solo contenedor por proceso aunque Next
 * empaquete el módulo en varias rutas. En desarrollo vive en el módulo para que
 * el recargado en caliente recoja cambios (p. ej. en site-content.ts); la
 * conexión a Mongo ya se comparte aparte (mongo/client.ts).
 */
const g: { __nnContainer?: Container | null } =
  process.env.NODE_ENV === "production" ? (globalThis as unknown as { __nnContainer?: Container | null }) : {};

function persistence(): Pick<Container, "watches" | "categories" | "orders" | "paymentSettings"> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      watches: new InMemoryWatchRepository(SEED_WATCHES),
      categories: new InMemoryCategoryRepository(SEED_CATEGORIES),
      orders: new InMemoryOrderRepository(),
      paymentSettings: new InMemoryPaymentSettingsRepository(),
    };
  }
  const db = mongoDb(uri, process.env.MONGODB_DB || "neonnight");
  return {
    watches: new MongoWatchRepository(db),
    categories: new MongoCategoryRepository(db),
    orders: new MongoOrderRepository(db),
    paymentSettings: new MongoPaymentSettingsRepository(db, adminSecret),
  };
}

export function createContainer(overrides: Partial<Container> = {}): Container {
  const base = { ...persistence(), ...overrides };
  return {
    watches: base.watches,
    categories: base.categories,
    orders: base.orders,
    paymentSettings: base.paymentSettings,
    payments: overrides.payments ?? new BoldPaymentGateway(base.paymentSettings, new NoopPaymentGateway()),
    media: overrides.media ?? (process.env.CLOUDINARY_URL ? new CloudinaryMediaUploader() : new LocalDiskMediaUploader()),
    analytics: overrides.analytics ?? new ConsoleAnalytics(),
    whatsapp:
      overrides.whatsapp ??
      new WaMeLinkBuilder(process.env.WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, {
        product: SITE_CONTENT.whatsapp.productMessageTemplate,
        generic: SITE_CONTENT.whatsapp.genericMessage,
        cart: SITE_CONTENT.cart.whatsappMessageTemplate,
      }),
    clock: overrides.clock ?? new SystemClock(),
    ids: overrides.ids ?? new RandomIdGenerator(),
    content: overrides.content ?? new StaticSiteContentRepository(),
  };
}

export function getContainer(): Container {
  return (g.__nnContainer ??= createContainer());
}

/** Solo para tests. */
export function resetContainer(): void {
  g.__nnContainer = null;
}
