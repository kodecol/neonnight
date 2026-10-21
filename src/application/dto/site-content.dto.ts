import type { ProductKind } from "@/domain/entities/product";
import type { InfoPageSlug } from "./info-page.dto";

/**
 * Contenido editorial del sitio. Todo lo que no es catálogo de producto
 * (copys, enlaces, redes, secciones de la home, footer) vive aquí para que
 * sea configurable desde un solo lugar y, más adelante, desde el CMS.
 */
export interface LinkItem {
  label: string;
  href: string;
  /** Abrir en pestaña nueva (enlaces externos). */
  external?: boolean;
}

export type SocialNetworkId = "instagram" | "facebook" | "tiktok" | "youtube";

export interface SocialNetwork {
  id: SocialNetworkId;
  label: string;
  handle: string;
  href: string;
  /** Qué publica la marca en esa red (una línea). */
  description: string;
  /** Texto de acción que aparece al pasar el cursor (p. ej. "Seguir"). */
  cta: string;
}

export interface TrustItem {
  number: string;
  title: string;
  body: string;
  /** Resalta el borde y el número con el acento. */
  accent?: boolean;
}

export interface Testimonial {
  quote: string;
  name: string;
  city: string;
  /** Pieza que compró, tal como se muestra (p. ej. "Rolex Datejust 36"). */
  piece: string;
  /** 1–5 */
  rating: number;
}

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** `object-position` al recortar (p. ej. "50% 25%"). */
  position?: string;
}

/** Logo de tercero. En reposo se muestra monocromo; al pasar el cursor, a color. */
export interface LogoAsset {
  src: string;
  /** Proporción ancho/alto del arte (viewBox recortado). */
  ratio: number;
  /** Reposo: silueta blanca (por defecto) o escala de grises (logos de varios tonos o rasterizados). */
  mono?: "silhouette" | "grayscale";
  /** Recorte circular (logos redondos rasterizados). */
  round?: boolean;
  /** Ajuste óptico del tamaño (1 = normal). */
  scale?: number;
}


export interface PaymentLogo {
  name: string;
  /** Tipo de medio, p. ej. "Crédito y débito". */
  caption: string;
  /** Sin logo oficial disponible → se muestra el nombre como texto. */
  logo?: LogoAsset;
}

/**
 * Identidad del vendedor (Ley 1480, art. 50: quien vende a distancia debe
 * identificarse). Lo opcional se omite en las páginas mientras no exista.
 */
export interface CompanyInfo {
  /** Nombre del establecimiento tal como figura en la matrícula. */
  tradeName: string;
  legalForm: string;
  registry: { chamber: string; number: string };
  /** Propietario del establecimiento y su NIT/cédula: responsable del tratamiento de datos. */
  owner?: { name: string; taxId: string };
  city: string;
  region: string;
  country: string;
  /** ISO 3166-1 alfa-2. */
  countryCode: string;
  foundingYear: number;
  email: string;
  /** Canal para consultas y reclamos sobre datos personales. */
  privacyEmail: string;
  /** Horario de atención (texto). */
  hours: string;
}

/**
 * Plazos y condiciones comerciales. Fuente única: alimentan las páginas
 * legales, los textos de la home y los datos estructurados para buscadores.
 */
export interface StorePolicies {
  warrantyMonths: number;
  /** Plazo de devolución que damos (días calendario desde la entrega). */
  returnDays: number;
  /** Derecho de retracto legal (Ley 1480, art. 47): días hábiles. */
  retractBusinessDays: number;
  /** Tope legal para reembolsar (días calendario). */
  refundMaxDays: number;
  shipping: {
    carrier: string;
    /** Página de la transportadora donde se consulta la guía (https). */
    trackingUrl: string;
    free: boolean;
    /** Días hábiles hasta despachar tras el pago aprobado. */
    handlingDays: number;
    /** Días hábiles de tránsito: ciudades principales y resto del país. */
    transitMain: [number, number];
    transitOther: [number, number];
    /** Tope legal de entrega (días calendario, Ley 1480 art. 50). */
    maxDays: number;
  };
}

export interface SiteContent {
  company: CompanyInfo;
  policies: StorePolicies;
  brand: {
    name: string;
    /** Wordmark en mayúsculas para header, loader y footer. */
    wordmark: string;
    tagline: string;
    description: string;
    /** Divisa que se muestra en el header. */
    currencyLabel: string;
    locale: string;
    logo: { mono: string; color: string };
  };
  social: {
    kicker: string;
    title: string;
    body: string;
    networks: SocialNetwork[];
  };
  navigation: {
    menu: LinkItem[];
    menuFooter: { whatsappLabel: string; instagramLabel: string; note: string };
    header: { menuLabel: string; collectionLabel: string; cartLabel: string };
  };
  home: {
    hero: {
      /** `{brand}` se sustituye por la marca del producto destacado. */
      kickerTemplate: string;
      fallbackKicker: string;
      fallbackTitle: string;
      primaryCta: string;
      secondaryCta: string;
    };
    catalog: { kicker: string; title: string; /** `{count}` se sustituye por el total. */ ctaTemplate: string; featuredCount: number };
    /** Portadas de las líneas. `{label}` y `{count}` se sustituyen por los de cada línea. */
    lines: { kicker: string; title: string; ctaTemplate: string; countTemplate: string };
    band: { title: string; image: ImageAsset };
    /** Las marcas del marquee salen del catálogo; aquí textos y logos por marca (clave en minúsculas). */
    /** Rótulo y aviso del marquee (las marcas salen de la colección `brands`). */
    brands: { label: string; disclaimer: string };
    trust: { kicker: string; items: TrustItem[] };
    testimonials: { kicker: string; title: string; note: string; items: Testimonial[] };
    payments: { kicker: string; title: string; body: string; /** Texto junto al logo de Bold. */ processedBy: string; logos: PaymentLogo[]; assurances: string[]; whatsappCta: string; whatsappMessage: string };
    motion: { kicker: string; title: string; body: string; cta: string; whatsappMessage: string };
  };
  collection: {
    title: string;
    breadcrumbHome: string;
    emptyMessage: string;
    /** Pestaña de toda la colección junto a las líneas. */
    allLabel: string;
    filterLabel: string;
    sortLabel: string;
    clearLabel: string;
    /** `{count}` se sustituye por el número de resultados. */
    resultsOne: string;
    resultsTemplate: string;
  };
  product: {
    specsKicker: string;
    tabs: { details: string; notes: string; specs: string; purchase: string };
    /** Textos que cambian según la plantilla de la línea. */
    byKind: Record<ProductKind, { pieceTab: string; descriptionTitle: string; galleryCaptions: [string, string]; variantLabel: string }>;
    notes: { kicker: string; title: string; top: [string, string]; heart: [string, string]; base: [string, string] };
    related: { kicker: string; title: string };
    purchase: { add: string; /** Pago directo de la pieza elegida, sin pasar por la bolsa. */ buyNow: string; chooseOption: string; quantity: string; /** `{count}` */ lowStockTemplate: string };
  };
  cart: {
    title: string;
    empty: string;
    total: string;
    checkout: string;
    whatsapp: string;
    whatsappPending: string;
    remove: string;
    close: string;
    whatsappMessageTemplate: string;
    /** Aviso bajo "Finalizar compra" (admite **negrita** y [enlaces](/ruta)). */
    legalNote: string;
  };
  footer: {
    columns: Array<{ title: string; links: LinkItem[] }>;
    /** Términos, privacidad… en la franja inferior. */
    legalLinks: LinkItem[];
    /** Enlace a la Superintendencia de Industria y Comercio (exigido en comercio electrónico). */
    authority: LinkItem;
    /** `{tradeName}`, `{number}`, `{chamber}` y `{city}` salen de `company`. */
    registryTemplate: string;
    cookieSettings: string;
    /** `{year}` se sustituye por el año actual. */
    copyrightTemplate: string;
  };
  /** Textos comunes de las páginas institucionales (/nosotros, /envios…). */
  info: {
    tocLabel: string;
    /** `{date}` y `{version}`. */
    effectiveTemplate: string;
    help: { kicker: string; title: string; body: string; whatsapp: string };
    /** Tarjetas "más información" al pie de cada página. */
    related: Record<InfoPageSlug, { label: string; body: string }>;
  };
  /** Banner de cookies (solo aparece si hay medición configurada). */
  consent: {
    title: string;
    body: string;
    accept: string;
    reject: string;
    configure: string;
    save: string;
    categories: Record<"necessary" | "analytics" | "marketing", { label: string; body: string }>;
  };
  whatsapp: {
    /** `{name}`, `{reference}`, `{url}` */
    productMessageTemplate: string;
    genericMessage: string;
  };
}
