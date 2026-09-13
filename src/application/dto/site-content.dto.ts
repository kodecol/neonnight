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

export interface SocialPost {
  src: string;
  alt: string;
  href: string;
  width: number;
  height: number;
}

export interface TrustItem {
  number: string;
  title: string;
  body: string;
  /** Resalta el borde y el número con el acento. */
  accent?: boolean;
}

export interface SiteContent {
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
    instagram: { handle: string; url: string; followLabel: string; posts: SocialPost[] };
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
    band: { title: string };
    trust: { kicker: string; items: TrustItem[] };
    motion: { kicker: string; title: string; body: string; cta: string; whatsappMessage: string };
  };
  collection: {
    title: string;
    breadcrumbHome: string;
    emptyMessage: string;
    filters: Array<{ label: string; category?: string; maxPriceUnits?: number }>;
  };
  product: {
    descriptionTitle: string;
    subnav: Array<{ id: string; label: string }>;
    galleryCaptions: [string, string];
    specsKicker: string;
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
  };
  footer: {
    columns: Array<{ title: string; links: LinkItem[] }>;
    legal: string;
    /** `{year}` se sustituye por el año actual. */
    copyrightTemplate: string;
  };
  whatsapp: {
    /** `{name}`, `{reference}`, `{url}` */
    productMessageTemplate: string;
    genericMessage: string;
  };
}
