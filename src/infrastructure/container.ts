import type { ProductRepository } from "@/domain/repositories/product-repository";
import type { LineRepository } from "@/domain/repositories/line-repository";
import type { OrderRepository } from "@/domain/repositories/order-repository";
import type { CategoryRepository } from "@/domain/repositories/category-repository";
import type { BrandRepository } from "@/domain/repositories/brand-repository";
import type { BrandsCopyRepository } from "@/application/ports/brands-copy";
import type { PaymentGateway } from "@/application/ports/payment-gateway";
import type { PaymentSettingsRepository } from "@/application/ports/payment-settings";
import type { MediaUploader } from "@/application/ports/media-uploader";
import type { Analytics } from "@/application/ports/analytics";
import type { WhatsAppLinkBuilder } from "@/application/ports/whatsapp-link-builder";
import type { Clock, IdGenerator } from "@/application/ports/clock";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import type { MediaRemover, SiteMediaRepository, VideoUploadSigner } from "@/application/ports/site-media";
import type { HomeSettingsRepository } from "@/application/ports/home-settings";
import type { LegalPagesRepository } from "@/application/ports/legal-pages";
import type { CompanySettingsRepository } from "@/application/ports/company-settings";
import type { AdminCredentialsRepository, LoginThrottle, PasswordHasher } from "@/application/ports/admin-credentials";
import { trackingIds, type TrackingIds } from "@/application/lib/tracking-ids";
import { InMemoryProductRepository } from "./repositories/in-memory-product-repository";
import { InMemoryLineRepository } from "./repositories/in-memory-line-repository";
import { InMemoryOrderRepository } from "./repositories/in-memory-order-repository";
import { InMemoryCategoryRepository } from "./repositories/in-memory-category-repository";
import { InMemoryPaymentSettingsRepository } from "./repositories/in-memory-payment-settings-repository";
import { mongoDb } from "./mongo/client";
import { MongoProductRepository } from "./mongo/mongo-product-repository";
import { MongoLineRepository } from "./mongo/mongo-line-repository";
import { MongoOrderRepository } from "./mongo/mongo-order-repository";
import { MongoCategoryRepository } from "./mongo/mongo-category-repository";
import { MongoBrandRepository } from "./mongo/mongo-brand-repository";
import { MongoBrandsCopyRepository } from "./mongo/mongo-brands-copy-repository";
import { InMemoryBrandRepository } from "./repositories/in-memory-brand-repository";
import { InMemoryBrandsCopyRepository } from "./repositories/in-memory-brands-copy-repository";
import { MongoPaymentSettingsRepository } from "./mongo/mongo-payment-settings-repository";
import { MongoHomeSettingsRepository, MongoSiteMediaRepository } from "./mongo/mongo-site-content-repositories";
import { InMemoryHomeSettingsRepository, InMemorySiteMediaRepository } from "./repositories/in-memory-site-content-repositories";
import { InMemoryCompanySettingsRepository, InMemoryLegalPagesRepository } from "./repositories/in-memory-legal-repositories";
import { MongoCompanySettingsRepository, MongoLegalPagesRepository } from "./mongo/mongo-legal-repositories";
import { CloudinaryMediaRemover, CloudinaryVideoSigner, DisabledVideoSigner, NoopMediaRemover, SITE_FOLDER } from "./media/cloudinary-site-media";
import { NoopPaymentGateway } from "./payments/noop-payment-gateway";
import { BoldPaymentGateway } from "./payments/bold-payment-gateway";
import { LocalDiskMediaUploader } from "./media/local-disk-uploader";
import { CloudinaryMediaUploader } from "./media/cloudinary-uploader";
import { adminSecret } from "./auth/session";
import { ScryptPasswordHasher } from "./auth/password";
import { InMemoryLoginThrottle, createLoginThrottles } from "./auth/login-throttle";
import { MongoAdminCredentialsRepository } from "./mongo/mongo-admin-credentials-repository";
import { InMemoryAdminCredentialsRepository } from "./repositories/in-memory-admin-credentials-repository";
import { ConsoleAnalytics } from "./analytics/console-analytics";
import { WaMeLinkBuilder } from "./whatsapp/wa-me-link-builder";
import { RandomIdGenerator, SystemClock } from "./system";
import { SEED_BRANDS, SEED_CATEGORIES, SEED_LINES, SEED_PRODUCTS } from "./cms/seed";
import { SITE_CONTENT } from "./content/site-content";
import { StaticSiteContentRepository } from "./content/static-site-content-repository";
import { ManagedSiteContentRepository } from "./content/managed-site-content-repository";
import { InMemoryIdentitySettingsRepository } from "./repositories/in-memory-identity-repository";
import { MongoIdentitySettingsRepository } from "./mongo/mongo-identity-repository";
import type { IdentitySettingsRepository } from "@/application/ports/identity-settings";
import type { AppearanceSettingsRepository, StoreAppearance } from "@/application/ports/appearance-settings";
import { InMemoryVersionedSettings } from "./repositories/in-memory-versioned-settings";
import { MongoVersionedSettings } from "./mongo/mongo-versioned-settings";

/**
 * Contenedor tipado y explícito. Sin framework de DI.
 * Funciona igual en server components, route handlers y tests:
 *   createContainer({ products: new InMemoryProductRepository([...]) })
 *
 * Con MONGODB_URI los repositorios son de Mongo; sin ella, en memoria
 * (tests, e2e y desarrollo sin base). Con CLOUDINARY_URL las fotos van a
 * Cloudinary; sin ella, a disco local.
 */
export interface Container {
  products: ProductRepository;
  lines: LineRepository;
  categories: CategoryRepository;
  /** Marcas del catálogo (panel › Marcas) y el rótulo y aviso del marquee. */
  brands: BrandRepository;
  brandsCopy: BrandsCopyRepository;
  /** Logos de marca: Cloudinary `neonnight/sitio/marcas` o disco local. */
  brandUploader: MediaUploader;
  orders: OrderRepository;
  paymentSettings: PaymentSettingsRepository;
  /** Biblioteca de medios y contenido de la home (sección "Inicio" del panel). */
  siteMedia: SiteMediaRepository;
  homeSettings: HomeSettingsRepository;
  /** Páginas legales editadas y datos de la empresa (panel › Legales). */
  legalPages: LegalPagesRepository;
  companySettings: CompanySettingsRepository;
  /** Identidad de la tienda (nombre, wordmark, isotipo, logo): panel › Identidad. */
  identity: IdentitySettingsRepository;
  /** Colores y tipografía de la tienda: Ajustes › Apariencia. */
  appearance: AppearanceSettingsRepository;
  /** Contenido del código, sin nada de lo editado en el panel (la identidad "de fábrica"). */
  codeContent: SiteContentRepository;
  identityUploader: MediaUploader;
  /** Contraseña (hash) y versión de sesión del administrador (panel › Cuenta). */
  adminCredentials: AdminCredentialsRepository;
  passwordHasher: PasswordHasher;
  loginThrottles: { perIp: LoginThrottle; global: LoginThrottle };
  /** Pedidos por IP en /api/checkout (CHECKOUT_RATE_LIMIT por minuto, 10 por defecto). */
  checkoutThrottle: LoginThrottle;
  /** WhatsApp con formato legible, para las fichas de las páginas legales. */
  whatsappLabel: string | null;
  /** Fotos del sitio: Cloudinary `neonnight/sitio` o disco local. */
  siteUploader: MediaUploader;
  videoSigner: VideoUploadSigner;
  mediaRemover: MediaRemover;
  payments: PaymentGateway;
  media: MediaUploader;
  analytics: Analytics;
  whatsapp: WhatsAppLinkBuilder;
  clock: Clock;
  ids: IdGenerator;
  content: SiteContentRepository;
  /** IDs de Google Analytics y del píxel de Meta (runtime, ya validados). */
  tracking: TrackingIds;
}

/**
 * En producción vive en globalThis: un solo contenedor por proceso aunque Next
 * empaquete el módulo en varias rutas. En desarrollo vive en el módulo para que
 * el recargado en caliente recoja cambios (p. ej. en site-content.ts); la
 * conexión a Mongo ya se comparte aparte (mongo/client.ts).
 */
const g: { __nnContainer?: Container | null } =
  process.env.NODE_ENV === "production" ? (globalThis as unknown as { __nnContainer?: Container | null }) : {};

function persistence(): Pick<Container, "products" | "lines" | "categories" | "brands" | "brandsCopy" | "orders" | "paymentSettings" | "siteMedia" | "homeSettings" | "legalPages" | "companySettings" | "identity" | "appearance" | "adminCredentials"> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      products: new InMemoryProductRepository(SEED_PRODUCTS),
      lines: new InMemoryLineRepository(SEED_LINES),
      categories: new InMemoryCategoryRepository(SEED_CATEGORIES),
      brands: new InMemoryBrandRepository(SEED_BRANDS),
      brandsCopy: new InMemoryBrandsCopyRepository(),
      orders: new InMemoryOrderRepository(),
      paymentSettings: new InMemoryPaymentSettingsRepository(),
      siteMedia: new InMemorySiteMediaRepository(),
      homeSettings: new InMemoryHomeSettingsRepository(),
      legalPages: new InMemoryLegalPagesRepository(),
      companySettings: new InMemoryCompanySettingsRepository(),
      identity: new InMemoryIdentitySettingsRepository(),
      appearance: new InMemoryVersionedSettings<StoreAppearance>(),
      adminCredentials: new InMemoryAdminCredentialsRepository(),
    };
  }
  const db = mongoDb(uri, process.env.MONGODB_DB || "neonnight");
  return {
    products: new MongoProductRepository(db),
    lines: new MongoLineRepository(db),
    categories: new MongoCategoryRepository(db),
    brands: new MongoBrandRepository(db),
    brandsCopy: new MongoBrandsCopyRepository(db),
    orders: new MongoOrderRepository(db),
    paymentSettings: new MongoPaymentSettingsRepository(db, adminSecret),
    siteMedia: new MongoSiteMediaRepository(db),
    homeSettings: new MongoHomeSettingsRepository(db),
    legalPages: new MongoLegalPagesRepository(db),
    companySettings: new MongoCompanySettingsRepository(db),
    identity: new MongoIdentitySettingsRepository(db),
    appearance: new MongoVersionedSettings<StoreAppearance>(db, "appearance", ({ preset, colors, fonts, updatedAt }) => ({ preset, colors: { ...colors }, fonts: { ...fonts }, updatedAt })),
    adminCredentials: new MongoAdminCredentialsRepository(db),
  };
}

export function createContainer(overrides: Partial<Container> = {}): Container {
  const base = { ...persistence(), ...overrides };
  const whatsappNumber = process.env.WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const staticContent = new StaticSiteContentRepository(SITE_CONTENT, whatsappNumber);
  return {
    products: base.products,
    lines: base.lines,
    categories: base.categories,
    brands: base.brands,
    brandsCopy: base.brandsCopy,
    brandUploader: overrides.brandUploader ?? (process.env.CLOUDINARY_URL ? new CloudinaryMediaUploader(`${SITE_FOLDER}/marcas`) : new LocalDiskMediaUploader()),
    orders: base.orders,
    paymentSettings: base.paymentSettings,
    siteMedia: base.siteMedia,
    homeSettings: base.homeSettings,
    legalPages: base.legalPages,
    companySettings: base.companySettings,
    identity: base.identity,
    appearance: base.appearance,
    identityUploader: overrides.identityUploader ?? (process.env.CLOUDINARY_URL ? new CloudinaryMediaUploader(`${SITE_FOLDER}/identidad`) : new LocalDiskMediaUploader()),
    adminCredentials: base.adminCredentials,
    passwordHasher: overrides.passwordHasher ?? new ScryptPasswordHasher(),
    loginThrottles: overrides.loginThrottles ?? createLoginThrottles(),
    checkoutThrottle: overrides.checkoutThrottle ?? new InMemoryLoginThrottle(Number(process.env.CHECKOUT_RATE_LIMIT) || 10, 60_000),
    whatsappLabel: staticContent.whatsapp,
    siteUploader: overrides.siteUploader ?? (process.env.CLOUDINARY_URL ? new CloudinaryMediaUploader(SITE_FOLDER) : new LocalDiskMediaUploader()),
    videoSigner: overrides.videoSigner ?? (process.env.CLOUDINARY_URL ? new CloudinaryVideoSigner() : new DisabledVideoSigner()),
    mediaRemover: overrides.mediaRemover ?? (process.env.CLOUDINARY_URL ? new CloudinaryMediaRemover() : new NoopMediaRemover()),
    payments: overrides.payments ?? new BoldPaymentGateway(base.paymentSettings, new NoopPaymentGateway()),
    media: overrides.media ?? (process.env.CLOUDINARY_URL ? new CloudinaryMediaUploader() : new LocalDiskMediaUploader()),
    analytics: overrides.analytics ?? new ConsoleAnalytics(),
    whatsapp:
      overrides.whatsapp ??
      new WaMeLinkBuilder(whatsappNumber, {
        product: SITE_CONTENT.whatsapp.productMessageTemplate,
        generic: SITE_CONTENT.whatsapp.genericMessage,
        cart: SITE_CONTENT.cart.whatsappMessageTemplate,
      }),
    clock: overrides.clock ?? new SystemClock(),
    ids: overrides.ids ?? new RandomIdGenerator(),
    content:
      overrides.content ??
      new ManagedSiteContentRepository(staticContent, base.homeSettings, {
        pages: base.legalPages,
        company: base.companySettings,
        codePages: (company, policies) => staticContent.pagesFor(company, policies),
        whatsapp: staticContent.whatsapp,
      }, base.identity),
    codeContent: staticContent,
    tracking: overrides.tracking ?? trackingIds({ ga: process.env.GA_MEASUREMENT_ID, pixel: process.env.META_PIXEL_ID }),
  };
}

export function getContainer(): Container {
  return (g.__nnContainer ??= createContainer());
}

/** Solo para tests. */
export function resetContainer(): void {
  g.__nnContainer = null;
}
