import type { SiteContent } from "@/application/dto/site-content.dto";

/**
 * ÚNICO punto de edición del contenido editorial del sitio.
 * Los copys provienen del handoff (docs/handoff/README.md). Cuando exista CMS,
 * `StaticSiteContentRepository` se sustituye por un adaptador que devuelva
 * esta misma forma.
 *
 * Los posts de Instagram son recortes de fotos de catálogo de terceros SOLO
 * para el mockup (ver README "Nota legal").
 */
const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/neonnight";

export const SITE_CONTENT: SiteContent = {
  brand: {
    name: "Neon Night",
    wordmark: "NEON NIGHT",
    tagline: "El reloj que buscas, al precio que debió tener siempre.",
    description: "Relojes de lujo verificados en Colombia. Verificación en mano, garantía de 24 meses y devolución en 10 días.",
    currencyLabel: "COP",
    locale: "es-CO",
    logo: { mono: "/assets/isotipo-mono.png", color: "/assets/isotipo-color.png" },
  },

  social: {
    instagram: {
      handle: "@neonnight",
      url: INSTAGRAM_URL,
      followLabel: "Seguir en Instagram",
      posts: [
        { src: "/assets/ig/ig-01.jpg", alt: "Rolex Sky-Dweller en oro amarillo en la muñeca", href: INSTAGRAM_URL, width: 1080, height: 1080 },
        { src: "/assets/ig/ig-02.jpg", alt: "Omega Speedmaster Moonwatch sobre madera", href: INSTAGRAM_URL, width: 1080, height: 1080 },
        { src: "/assets/ig/ig-03.jpg", alt: "Cartier Santos en la muñeca", href: INSTAGRAM_URL, width: 1080, height: 1080 },
        { src: "/assets/ig/ig-04.jpg", alt: "Rolex Datejust 36 con dial azul sobre madera", href: INSTAGRAM_URL, width: 1080, height: 1080 },
      ],
    },
  },

  navigation: {
    header: { menuLabel: "Menú", collectionLabel: "Colección", cartLabel: "Bolsa" },
    menu: [
      { label: "Colección", href: "/coleccion" },
      { label: "Novedades", href: "/coleccion?orden=novedades" },
      { label: "Autenticidad", href: "/#autenticidad" },
      { label: "Showroom", href: "/#showroom" },
    ],
    menuFooter: {
      whatsappLabel: "Asesoría por WhatsApp",
      instagramLabel: "Instagram",
      note: "Envíos asegurados en Colombia · Pago contra verificación",
    },
  },

  home: {
    hero: {
      kickerTemplate: "{brand} · Nueva referencia",
      fallbackKicker: "Neon Night",
      fallbackTitle: "Relojes verificados",
      primaryCta: "Ver la pieza",
      secondaryCta: "Toda la colección",
    },
    catalog: {
      kicker: "Catálogo",
      title: "Vendemos relojes de marcas que conoces, a precios que no conocías",
      ctaTemplate: "Ver las {count} referencias",
      featuredCount: 6,
    },
    band: { title: "Cada pieza pasa por verificación antes de salir" },
    trust: {
      kicker: "Garantía y autenticidad",
      items: [
        { number: "01", title: "Verificación en mano", body: "Revisión de calibre, número de serie y caja antes de despachar. Informe fotográfico incluido." },
        { number: "02", title: "Garantía de 24 meses", body: "Cobertura de movimiento y hermeticidad, con servicio en Colombia." },
        { number: "03", title: "Devolución en 10 días", body: "Si la pieza no es lo que esperabas, la recogemos y devolvemos el pago completo.", accent: true },
      ],
    },
    motion: {
      kicker: "En movimiento",
      title: "Video vertical de cada referencia",
      body: "Un clip corto por pieza, grabado en el showroom: dial, corona, cierre y muñeca. El mismo material que enviamos por WhatsApp antes de la compra.",
      cta: "Pedir el video de una pieza",
      whatsappMessage: "Hola, quiero pedir el video de una pieza.",
    },
  },

  collection: {
    title: "Colección",
    breadcrumbHome: "Inicio",
    emptyMessage: "No hay referencias que coincidan con este filtro.",
    filters: [
      { label: "Todas" },
      { label: "Automáticos", category: "automatico" },
      { label: "Cronógrafos", category: "cronografo" },
      { label: "Hasta $35.000.000", maxPriceUnits: 35_000_000 },
    ],
  },

  product: {
    descriptionTitle: "Una referencia conocida, sin el sobreprecio de la vitrina",
    subnav: [
      { id: "pieza", label: "La pieza" },
      { id: "detalles", label: "Detalles" },
      { id: "especificaciones", label: "Especificaciones" },
      { id: "compra", label: "Compra" },
    ],
    galleryCaptions: ["Dial y agujas", "Caja y corona"],
    specsKicker: "Especificaciones",
  },

  cart: {
    title: "Tu bolsa",
    empty: "Aún no has añadido ninguna pieza.",
    total: "Total",
    checkout: "Finalizar compra",
    whatsapp: "O cerrar por WhatsApp",
    whatsappPending: "WhatsApp: número pendiente",
    remove: "Quitar",
    close: "Cerrar",
    whatsappMessageTemplate: "Hola, quiero cerrar por WhatsApp mi bolsa: {items}. Total {total}.",
  },

  footer: {
    columns: [
      {
        title: "Comprar",
        links: [
          { label: "Colección", href: "/coleccion" },
          { label: "Novedades", href: "/coleccion?orden=novedades" },
          { label: "Financiación", href: "/#showroom" },
        ],
      },
      {
        title: "Confianza",
        links: [
          { label: "Autenticidad", href: "/#autenticidad" },
          { label: "Garantía", href: "/#autenticidad" },
          { label: "Envíos y devoluciones", href: "/#autenticidad" },
        ],
      },
      {
        title: "Contacto",
        links: [
          { label: "WhatsApp", href: "whatsapp" },
          { label: "Instagram", href: INSTAGRAM_URL, external: true },
          { label: "Showroom Bogotá", href: "/#showroom" },
        ],
      },
    ],
    legal: "Términos · Privacidad · Cambios y devoluciones",
    copyrightTemplate: "© {year} Neon Night",
  },

  whatsapp: {
    productMessageTemplate: "Hola, me interesa el {name} (ref. {reference}). {url}",
    genericMessage: "Hola, quiero asesoría sobre una pieza de Neon Night.",
  },
};
