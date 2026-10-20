import type { SiteContent } from "@/application/dto/site-content.dto";

/**
 * ÚNICO punto de edición del contenido editorial del sitio.
 * Los copys provienen del handoff (docs/handoff/README.md). Cuando exista CMS,
 * `StaticSiteContentRepository` se sustituye por un adaptador que devuelva
 * esta misma forma.
 */
const INSTAGRAM_URL = process.env.INSTAGRAM_URL || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/neonnight";
// PENDIENTE: confirmar los perfiles reales de Facebook, TikTok y YouTube.
const FACEBOOK_URL = process.env.FACEBOOK_URL || process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com/neonnight";
const TIKTOK_URL = process.env.TIKTOK_URL || process.env.NEXT_PUBLIC_TIKTOK_URL || "https://tiktok.com/@neonnight";
const YOUTUBE_URL = process.env.YOUTUBE_URL || process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com/@neonnight";

export const SITE_CONTENT: SiteContent = {
  brand: {
    name: "Neon Night",
    wordmark: "NEON NIGHT",
    tagline: "El reloj que buscas, al precio que debió tener siempre.",
    description: "Relojes de lujo verificados en Colombia. Garantía de 12 meses y envíos asegurados en menos de 3 días.",
    currencyLabel: "COP",
    locale: "es-CO",
    logo: { mono: "/assets/isotipo-mono.png", color: "/assets/isotipo-color.png" },
  },

  social: {
    kicker: "Encuéntranos en redes",
    title: "Síguenos de cerca",
    body: "Piezas nuevas, videos en la muñeca y la verificación de cada referencia, primero en nuestras redes.",
    networks: [
      { id: "instagram", label: "Instagram", handle: "@neonnight", href: INSTAGRAM_URL, description: "Lanzamientos y detalles de cada pieza", cta: "Seguir" },
      { id: "facebook", label: "Facebook", handle: "Neon Night", href: FACEBOOK_URL, description: "Comunidad, novedades y showroom", cta: "Seguir" },
      { id: "tiktok", label: "TikTok", handle: "@neonnight", href: TIKTOK_URL, description: "Videos cortos en la muñeca", cta: "Seguir" },
      { id: "youtube", label: "YouTube", handle: "@neonnight", href: YOUTUBE_URL, description: "Reseñas y verificación en detalle", cta: "Suscribirse" },
    ],
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
    band: {
      title: "Cada pieza pasa por verificación antes de salir",
      // Foto: Puscas Adryan en Unsplash (Unsplash License, uso comercial libre).
      image: { src: "/assets/band-perfume.jpg", alt: "Frasco de perfume oscuro sobre un pedestal, con luz cálida de estudio", width: 2400, height: 2400, position: "50% 22%" },
    },
    brands: {
      label: "Marcas en colección",
      disclaimer: "Neon Night es un revendedor independiente y no está afiliado a las marcas mencionadas. Las marcas y logotipos pertenecen a sus titulares.",
      // Clave = marca del catálogo en minúsculas. Una marca sin logo se muestra como texto.
      logos: {
        rolex: { src: "/assets/logos/brands/rolex.svg", ratio: 5.07, color: "#127749" },
        omega: { src: "/assets/logos/brands/omega.svg", ratio: 2.01, color: "#E4002B" },
        cartier: { src: "/assets/logos/brands/cartier.svg", ratio: 3.42, color: "#D4202C" },
        tudor: { src: "/assets/logos/brands/tudor.svg", ratio: 1.76, color: "#E1251B" },
        "grand seiko": { src: "/assets/logos/brands/grand-seiko.svg", ratio: 2.29, color: "#6E8FBF" },
      },
    },
    trust: {
      kicker: "Garantía y autenticidad",
      items: [
        {
          number: "01",
          title: "Respaldo por defectos de fábrica",
          body: "Respondemos por los daños de fábrica de cada pieza. No se aceptan devoluciones por mal uso del producto.",
        },
        { number: "02", title: "Garantía de 12 meses", body: "Cobertura de movimiento y hermeticidad durante 12 meses, con servicio en Colombia." },
        {
          number: "03",
          title: "Envíos en menos de 3 días",
          body: "Despachamos asegurado a toda Colombia en menos de 3 días. No se aceptan devoluciones después de 10 días de la compra.",
          accent: true,
        },
      ],
    },
    // PENDIENTE: textos de EJEMPLO. Antes de publicar, reemplazar por testimonios reales con autorización
    // escrita de cada cliente (Ley 1480: la publicidad no puede inducir a error). Ver README.
    testimonials: {
      kicker: "Clientes",
      title: "Lo que dicen quienes ya compraron",
      note: "Testimonios de clientes en Colombia",
      items: [
        {
          quote: "Me enviaron el video de la pieza antes de pagar y el informe de verificación llegó con el reloj. Compré con la misma tranquilidad que en una boutique, a un precio que no encontré en ningún otro lado.",
          name: "Andrés M.",
          city: "Medellín",
          piece: "Rolex Datejust 36",
          rating: 5,
        },
        {
          quote: "Llegó asegurado en dos días, impecable y con todos los papeles. Lo llevé a revisar a un relojero de confianza y confirmó cada detalle del informe.",
          name: "Carolina R.",
          city: "Bogotá",
          piece: "Cartier Santos",
          rating: 5,
        },
        {
          quote: "La asesoría por WhatsApp fue clara de principio a fin: me explicaron referencia, estado y garantía sin presionar la compra. Ya estoy mirando la segunda pieza.",
          name: "Felipe G.",
          city: "Cali",
          piece: "Omega Speedmaster",
          rating: 5,
        },
        {
          quote: "Buscaba un Tudor en excelente estado y lo encontré aquí. El empaque, la entrega y el seguimiento estuvieron a la altura de la pieza.",
          name: "Juliana P.",
          city: "Barranquilla",
          piece: "Tudor Black Bay 58",
          rating: 5,
        },
      ],
    },
    payments: {
      kicker: "Métodos de pago",
      title: "Paga como prefieras",
      body: "Pagos procesados por Bold, con la seguridad de la banca colombiana. Elige el medio al finalizar la compra.",
      // PENDIENTE: confirmar en el panel de Bold los medios habilitados (en especial Daviplata).
      logos: [
        { name: "Visa", caption: "Crédito y débito", logo: { src: "/assets/logos/payments/visa.svg", ratio: 2.97 } },
        { name: "Mastercard", caption: "Crédito y débito", logo: { src: "/assets/logos/payments/mastercard.svg", ratio: 1.6, mono: "grayscale" } },
        { name: "American Express", caption: "Crédito", logo: { src: "/assets/logos/payments/amex.svg", ratio: 1 } },
        { name: "Bold", caption: "Pasarela de pagos", logo: { src: "/assets/logos/payments/bold.svg", ratio: 2.82 } },
        { name: "PSE", caption: "Débito desde cualquier banco", logo: { src: "/assets/logos/payments/pse.jpg", ratio: 1, mono: "grayscale", round: true } },
        { name: "Nequi", caption: "Billetera digital", logo: { src: "/assets/logos/payments/nequi.svg", ratio: 3.09 } },
        { name: "Bancolombia", caption: "Botón Bancolombia", logo: { src: "/assets/logos/payments/bancolombia.svg", ratio: 4.01, scale: 1.35 } },
        // Sin logo oficial descargable todavía: se muestra el nombre.
        { name: "Daviplata", caption: "Billetera digital" },
      ],
      processedBy: "Procesado por",
      assurances: ["Conexión cifrada", "Confirmación al aprobarse el pago", "Garantía de 12 meses en cada pieza"],
      whatsappCta: "¿Otro medio de pago? Escríbenos",
      whatsappMessage: "Hola, quiero consultar otros medios de pago para una pieza.",
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
    // Los chips de categoría se generan de las categorías del panel (/admin) entre "Todas" y los de precio.
    filters: [
      { label: "Todas" },
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
