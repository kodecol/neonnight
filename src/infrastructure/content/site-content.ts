import type { SiteContent } from "@/application/dto/site-content.dto";

/**
 * ÚNICO punto de edición del contenido editorial del sitio.
 * Los copys parten del handoff (docs/handoff/README.md) y se ampliaron a las
 * líneas de relojería, joyería y perfumería. Cuando exista CMS,
 * `StaticSiteContentRepository` se sustituye por un adaptador que devuelva
 * esta misma forma.
 */
const INSTAGRAM_URL = process.env.INSTAGRAM_URL || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/neonnight01/";
const FACEBOOK_URL = process.env.FACEBOOK_URL || process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/neonnightonline/";
const YOUTUBE_URL = process.env.YOUTUBE_URL || process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://www.youtube.com/NeonNightsChannel";
// TikTok aparece solo cuando exista el perfil (TIKTOK_URL).
const TIKTOK_URL = process.env.TIKTOK_URL || process.env.NEXT_PUBLIC_TIKTOK_URL || "";

/**
 * Transportadora por defecto. Se edita en el panel › Legales › Envíos; los
 * textos que la nombran la toman de aquí (y el panel la reemplaza al fusionar).
 */
export const CARRIER = "Interrapidísimo";

export const SITE_CONTENT: SiteContent = {
  company: {
    tradeName: "NEON NIGHT",
    legalForm: "Establecimiento de comercio",
    registry: { chamber: "Cámara de Comercio de Bogotá", number: "3812180" },
    // PENDIENTE: propietario del establecimiento y su NIT (responsable del tratamiento de datos).
    city: "Bogotá D.C.",
    region: "Bogotá D.C.",
    country: "Colombia",
    countryCode: "CO",
    foundingYear: 2025,
    // PENDIENTE: confirmar que el buzón existe antes del lanzamiento.
    email: "contacto@neonightonline.com",
    privacyEmail: "contacto@neonightonline.com",
    hours: "Lunes a sábado, de 9:00 a. m. a 7:00 p. m. (hora de Colombia)",
  },

  policies: {
    warrantyMonths: 12,
    returnDays: 10,
    retractBusinessDays: 5,
    refundMaxDays: 30,
    shipping: { carrier: CARRIER, trackingUrl: "https://www.interrapidisimo.com/", free: true, handlingDays: 1, transitMain: [1, 3], transitOther: [3, 6], maxDays: 30 },
  },

  brand: {
    name: "Neon Night",
    wordmark: "NEON NIGHT",
    tagline: "Relojes, joyas y perfumes de las grandes casas, verificados uno por uno y a un precio justo.",
    description: "Relojes, joyas y perfumes de lujo nuevos y auténticos en Colombia. Cada pieza verificada en mano, con garantía de 12 meses y envío asegurado sin costo.",
    currencyLabel: "COP",
    locale: "es-CO",
    logo: { mono: "/assets/isotipo-mono.png", color: "/assets/isotipo-color.png" },
  },

  social: {
    kicker: "En redes",
    title: "Síguenos de cerca",
    body: "Lo que acaba de llegar, piezas en uso y el detrás de cada verificación. Lo publicamos primero en redes.",
    networks: [
      { id: "instagram", label: "Instagram", handle: "@neonnight01", href: INSTAGRAM_URL, description: "Llegadas nuevas y detalles de cada pieza", cta: "Seguir" },
      { id: "facebook", label: "Facebook", handle: "neonnightonline", href: FACEBOOK_URL, description: "Novedades y lo que pasa detrás de cámaras", cta: "Seguir" },
      { id: "youtube", label: "YouTube", handle: "NeonNightsChannel", href: YOUTUBE_URL, description: "Reseñas y verificaciones paso a paso", cta: "Suscribirse" },
      ...(TIKTOK_URL ? [{ id: "tiktok" as const, label: "TikTok", handle: "Neon Night", href: TIKTOK_URL, description: "Videos cortos de las piezas en uso", cta: "Seguir" }] : []),
    ],
  },

  navigation: {
    header: { menuLabel: "Menú", collectionLabel: "Colección", cartLabel: "Bolsa" },
    // Las líneas del catálogo se anteponen solas (vienen del panel).
    menu: [
      { label: "Toda la colección", href: "/coleccion" },
      { label: "Autenticidad", href: "/#autenticidad" },
      { label: "Nosotros", href: "/nosotros" },
    ],
    menuFooter: {
      whatsappLabel: "Asesoría por WhatsApp",
      instagramLabel: "Instagram",
      note: "Envío asegurado sin costo a toda Colombia · Garantía de 12 meses",
    },
  },

  home: {
    hero: {
      kickerTemplate: "{brand} · Recién llegado",
      fallbackKicker: "Neon Night",
      fallbackTitle: "Piezas verificadas",
      primaryCta: "Ver la pieza",
      secondaryCta: "Explorar la colección",
    },
    catalog: {
      kicker: "Selección",
      title: "Piezas de las casas que conoces, a precios que no esperabas",
      ctaTemplate: "Ver las {count} piezas",
      featuredCount: 6,
    },
    lines: {
      kicker: "Nuestras líneas",
      title: "Un mismo criterio para todo lo que vendemos",
      ctaTemplate: "Explorar {label}",
      countTemplate: "{count} piezas",
    },
    band: {
      title: "Nada sale de aquí sin pasar por nuestras manos",
      // Foto: Puscas Adryan en Unsplash (Unsplash License, uso comercial libre).
      image: { src: "/assets/band-perfume.jpg", alt: "Frasco de perfume oscuro sobre un pedestal, con luz cálida de estudio", width: 2400, height: 2400, position: "50% 22%" },
    },
    brands: {
      label: "Las casas que trabajamos",
      disclaimer: "Neon Night es un revendedor independiente y no está afiliado a las marcas mencionadas. Las marcas y logotipos pertenecen a sus titulares.",
      // Las marcas y sus logos se administran en el panel › Marcas (colección `brands`).
    },
    trust: {
      kicker: "Garantía y autenticidad",
      items: [
        {
          number: "01",
          title: "Verificado en mano",
          body: "Revisamos cada pieza antes de publicarla: referencia, número de serie o lote, y estado real. Respondemos por cualquier defecto de fábrica; el mal uso no lo cubre.",
        },
        {
          number: "02",
          title: "Garantía de 12 meses",
          body: "Doce meses desde la entrega, en todas las piezas. En relojes cubre movimiento y hermeticidad; en joyas y perfumes, cualquier defecto de fábrica.",
        },
        {
          number: "03",
          title: "Envío asegurado, sin costo",
          body: `Despachamos al siguiente día hábil con ${CARRIER}, asegurado y sin costo, a toda Colombia. Tienes 10 días desde la entrega para devolver la pieza.`,
          accent: true,
        },
      ],
    },
    // PENDIENTE: textos de EJEMPLO. Antes de publicar, reemplazar por testimonios reales con autorización
    // escrita de cada cliente (Ley 1480: la publicidad no puede inducir a error). Ver README.
    testimonials: {
      kicker: "Clientes",
      title: "Lo que cuentan quienes ya compraron",
      note: "Testimonios de clientes en Colombia",
      items: [
        {
          quote: "Antes de pagar me mandaron un video del reloj, y el informe de verificación llegó con él. Compré con la tranquilidad de una boutique, a un precio que no encontré en ningún otro lado.",
          name: "Andrés M.",
          city: "Medellín",
          piece: "Rolex Datejust 36",
          rating: 5,
        },
        {
          quote: "Llevaba años queriendo el LOVE y me daba miedo comprarlo fuera de una tienda oficial. Llegó en dos días, con su estuche y su certificado, y me explicaron cómo revisar el número de serie.",
          name: "Carolina R.",
          city: "Bogotá",
          piece: "Cartier LOVE",
          rating: 5,
        },
        {
          quote: "Pedí el Baccarat Rouge sellado y con el lote a la vista. Me resolvieron todas las dudas por WhatsApp, sin afanes ni presión. Ya voy por el segundo.",
          name: "Mariana S.",
          city: "Cali",
          piece: "Baccarat Rouge 540",
          rating: 5,
        },
        {
          quote: "La asesoría fue clara de principio a fin: referencia, estado y garantía, sin rodeos. El empaque y la entrega estuvieron a la altura del reloj.",
          name: "Felipe G.",
          city: "Barranquilla",
          piece: "Omega Speedmaster",
          rating: 5,
        },
      ],
    },
    payments: {
      kicker: "Métodos de pago",
      title: "Paga como prefieras",
      body: "Los pagos los procesa Bold, con la seguridad de la banca colombiana. Eliges el medio al finalizar la compra.",
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
      assurances: ["Conexión cifrada", "Confirmación en cuanto se aprueba el pago", "Garantía en cada pieza"],
      whatsappCta: "¿Prefieres otro medio de pago? Escríbenos",
      whatsappMessage: "Hola, quiero consultar otros medios de pago para una pieza.",
    },
    motion: {
      kicker: "En movimiento",
      title: "Antes de comprar, mírala de cerca",
      body: "Grabamos cada pieza en el estudio: el dial y la corona de un reloj, el brillo de una joya, el frasco y su lote. Te mandamos el video por WhatsApp antes de que decidas.",
      cta: "Pedir el video de una pieza",
      whatsappMessage: "Hola, quiero pedir el video de una pieza.",
    },
  },

  collection: {
    title: "Colección",
    breadcrumbHome: "Inicio",
    emptyMessage: "No encontramos piezas con estos filtros. Prueba quitando alguno.",
    allLabel: "Todo",
    filterLabel: "Filtrar",
    sortLabel: "Ordenar",
    clearLabel: "Quitar filtros",
    resultsOne: "1 pieza",
    resultsTemplate: "{count} piezas",
  },

  product: {
    specsKicker: "Ficha técnica",
    tabs: { details: "Detalles", notes: "Notas", specs: "Ficha", purchase: "Compra" },
    byKind: {
      reloj: {
        pieceTab: "El reloj",
        descriptionTitle: "Una referencia conocida, sin el sobreprecio de la vitrina",
        galleryCaptions: ["Dial y agujas", "Caja y corona"],
        variantLabel: "Versión",
      },
      joya: {
        pieceTab: "La joya",
        descriptionTitle: "Un diseño que no pasa de moda",
        galleryCaptions: ["La pieza", "Otro ángulo"],
        variantLabel: "Elige tu opción",
      },
      perfume: {
        pieceTab: "La fragancia",
        descriptionTitle: "Una firma que se reconoce antes de verla",
        galleryCaptions: ["El frasco", "Otro ángulo"],
        variantLabel: "Presentación",
      },
      general: {
        pieceTab: "La pieza",
        descriptionTitle: "Elegida y verificada por nosotros",
        galleryCaptions: ["Vista principal", "Detalle"],
        variantLabel: "Elige tu opción",
      },
    },
    notes: {
      kicker: "Pirámide olfativa",
      title: "Cómo evoluciona en la piel",
      top: ["Salida", "Los primeros minutos"],
      heart: ["Corazón", "Las primeras horas"],
      base: ["Fondo", "Lo que queda al final del día"],
    },
    related: { kicker: "Sigue explorando", title: "También te puede gustar" },
    purchase: {
      add: "Añadir a la bolsa",
      buyNow: "Comprar ahora",
      chooseOption: "Elige una opción",
      quantity: "Cantidad",
      lowStockTemplate: "Quedan {count}",
    },
  },

  cart: {
    title: "Tu bolsa",
    empty: "Tu bolsa está vacía.",
    total: "Total",
    checkout: "Finalizar compra",
    whatsapp: "O cierra la compra por WhatsApp",
    whatsappPending: "WhatsApp: número pendiente",
    remove: "Quitar",
    close: "Cerrar",
    whatsappMessageTemplate: "Hola, quiero cerrar por WhatsApp mi bolsa: {items}. Total {total}.",
    legalNote: "Al continuar aceptas los [términos y condiciones](/terminos) y la [política de privacidad](/privacidad). Envío asegurado sin costo y [10 días para devolver](/devoluciones).",
  },

  footer: {
    columns: [
      {
        title: "Comprar",
        links: [
          { label: "Relojería", href: "/coleccion/relojeria" },
          { label: "Joyería", href: "/coleccion/joyeria" },
          { label: "Perfumería", href: "/coleccion/perfumeria" },
          { label: "Toda la colección", href: "/coleccion" },
        ],
      },
      {
        title: "Ayuda",
        links: [
          { label: "Envíos", href: "/envios" },
          { label: "Pagos", href: "/pagos" },
          { label: "Garantía", href: "/garantia" },
          { label: "Cambios y devoluciones", href: "/devoluciones" },
          { label: "Autenticidad", href: "/#autenticidad" },
        ],
      },
      {
        title: "Neon Night",
        links: [
          { label: "Nosotros", href: "/nosotros" },
          { label: "WhatsApp", href: "whatsapp" },
          // "redes" se expande con las redes activas (panel › Inicio › Redes).
          { label: "Redes", href: "redes" },
        ],
      },
    ],
    legalLinks: [
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Privacidad y cookies", href: "/privacidad" },
    ],
    authority: { label: "Superintendencia de Industria y Comercio", href: "https://www.sic.gov.co", external: true },
    registryTemplate: "{tradeName} · Matrícula mercantil {number} de la {chamber}",
    cookieSettings: "Preferencias de cookies",
    copyrightTemplate: "© {year} Neon Night",
  },

  info: {
    tocLabel: "En esta página",
    effectiveTemplate: "Vigente desde el {date} · Versión {version}",
    help: {
      kicker: "¿Te quedó alguna duda?",
      title: "Escríbenos",
      body: "Te responde una persona del equipo, por WhatsApp o por correo, en horario de atención.",
      whatsapp: "Hablar por WhatsApp",
    },
    related: {
      nosotros: { label: "Nosotros", body: "Quiénes somos y cómo verificamos cada pieza." },
      envios: { label: "Envíos", body: `Asegurados y sin costo a toda Colombia, con ${CARRIER}.` },
      pagos: { label: "Pagos", body: "Medios de pago, seguridad y confirmación del pedido." },
      garantia: { label: "Garantía", body: "12 meses en todas las piezas, desde la entrega." },
      devoluciones: { label: "Cambios y devoluciones", body: "10 días para devolver o cambiar tu pieza." },
      terminos: { label: "Términos y condiciones", body: "Las reglas de compra en la tienda." },
      privacidad: { label: "Privacidad y cookies", body: "Cómo tratamos tus datos y tus derechos." },
    },
  },

  consent: {
    title: "Tu privacidad",
    body: "Usamos almacenamiento propio para que la tienda funcione, como tu bolsa. Con tu permiso, también usamos Google Analytics para entender cómo se usa el sitio y el píxel de Meta para medir nuestras campañas. Puedes cambiar de opinión cuando quieras desde el pie de página. [Más información](/privacidad#cookies)",
    accept: "Aceptar todas",
    reject: "Rechazar",
    configure: "Configurar",
    save: "Guardar preferencias",
    categories: {
      necessary: { label: "Necesarias", body: "Guardan tu bolsa y esta elección. Siempre activas." },
      analytics: { label: "Analítica", body: "Google Analytics: páginas vistas y uso del sitio, en cifras agregadas." },
      marketing: { label: "Publicidad", body: "Píxel de Meta: mide qué campañas funcionan y permite mostrarte anuncios relevantes en Facebook e Instagram." },
    },
  },

  whatsapp: {
    productMessageTemplate: "Hola, me interesa {name} (ref. {reference}). {url}",
    genericMessage: "Hola, quiero asesoría sobre una pieza de Neon Night.",
  },
};
