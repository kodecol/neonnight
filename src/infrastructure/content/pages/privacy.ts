import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, type PageContext } from "./context";

/** Fecha de vigencia en texto: "20 de octubre de 2026". */
function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${months[m - 1]} de ${y}`;
}

export function privacyPage(ctx: PageContext): InfoPage {
  const { company } = ctx;
  const establishment = `${company.tradeName}, ${company.legalForm.toLowerCase()} con matrícula mercantil ${company.registry.number} de la ${company.registry.chamber}`;
  return {
    slug: "privacidad",
    layout: "legal",
    kicker: "Legal",
    title: "Privacidad y cookies",
    description: `Política de tratamiento de datos personales y de cookies de ${company.tradeName}: qué datos recogemos, para qué, con quién los compartimos y cómo ejercer tus derechos.`,
    lead: "Cómo tratamos tus datos personales, para qué los usamos y cómo puedes conocerlos, corregirlos o pedir que los borremos. Cumple la Ley 1581 de 2012 y el Decreto 1377 de 2013, hoy compilado en el Decreto 1074 de 2015.",
    updatedAt: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      {
        id: "responsable",
        title: "Responsable del tratamiento",
        blocks: [
          {
            type: "facts",
            items: [
              company.owner
                ? { label: "Responsable", value: `${company.owner.name}, propietario de ${establishment}` }
                : { label: "Responsable", value: establishment },
              ...(company.owner ? [{ label: "NIT o cédula", value: company.owner.taxId }] : []),
              { label: "Domicilio", value: `${company.city}, ${company.country}` },
              { label: "Correo para datos personales", value: company.privacyEmail },
              { label: "WhatsApp", value: ctx.whatsapp ?? "Botón de WhatsApp del sitio" },
              { label: "Área encargada", value: `Atención al cliente de ${company.tradeName}` },
            ],
          },
        ],
      },
      {
        id: "datos",
        title: "Qué datos recogemos",
        blocks: [
          {
            type: "table",
            head: ["Cuándo", "Qué datos"],
            rows: [
              ["Cuando nos escribes por WhatsApp o correo", "Nombre, número de teléfono o correo y el contenido de la conversación."],
              ["Cuando compras", "Nombre, documento de identidad, correo, teléfono, dirección y ciudad de entrega, las piezas compradas y la referencia y el estado del pago."],
              [
                "Cuando navegas el sitio",
                "Datos técnicos como la dirección IP, el navegador y las páginas visitadas, en los registros del servidor. Solo si lo aceptas, identificadores de cookies de analítica y publicidad.",
              ],
              ["Tu bolsa", "Las piezas que agregas se guardan en tu propio navegador. No las recibimos hasta que finalizas la compra."],
            ],
          },
          {
            type: "p",
            text: "No pedimos datos sensibles ni datos de menores de edad. Tampoco vemos ni guardamos los datos de tu tarjeta: los recibe y protege Bold, nuestra pasarela de pagos.",
          },
        ],
      },
      {
        id: "finalidades",
        title: "Para qué los usamos",
        blocks: [
          {
            type: "list",
            items: [
              "Responder tus consultas y asesorarte sobre las piezas.",
              "Procesar tus pedidos, pagos, facturación y entregas.",
              "Atender garantías, cambios, devoluciones, retractos y peticiones, quejas y reclamos.",
              "Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridades.",
              "Prevenir el fraude y proteger la seguridad del sitio.",
              "Con tu autorización: medir el uso del sitio con Google Analytics y el resultado de nuestras campañas con el píxel de Meta.",
              "Con tu autorización: enviarte novedades y ofertas por WhatsApp o correo. Puedes pedirnos que dejemos de hacerlo cuando quieras.",
            ],
          },
          {
            type: "p",
            text: "Respetamos la Ley 2300 de 2023: solo te contactamos con fines comerciales por los canales que autorices, de lunes a viernes de 7:00 a. m. a 7:00 p. m. y los sábados de 8:00 a. m. a 3:00 p. m., nunca domingos ni festivos.",
          },
        ],
      },
      {
        id: "autorizacion",
        title: "Autorización",
        blocks: [
          {
            type: "p",
            text: "Al escribirnos o comprar nos autorizas a tratar tus datos para las finalidades de esta política. Para la analítica y la publicidad te pedimos un consentimiento aparte en el aviso de cookies.",
          },
          {
            type: "p",
            text: "Puedes revocar tu autorización en cualquier momento escribiéndonos, y retirar el consentimiento de cookies desde **Preferencias de cookies**, al pie de cada página.",
          },
        ],
      },
      {
        id: "encargados",
        title: "Con quién los compartimos",
        blocks: [
          {
            type: "p",
            text: "No vendemos ni alquilamos tus datos. Solo los compartimos con los proveedores que nos ayudan a operar, que actúan como encargados y únicamente pueden usarlos para prestarnos su servicio:",
          },
          {
            type: "table",
            head: ["Proveedor", "Para qué", "Dónde"],
            rows: [
              ["Bold", "Procesar los pagos", "Colombia"],
              [ctx.policies.shipping.carrier, "Entregar los pedidos", "Colombia"],
              ["MongoDB Atlas (MongoDB, Inc.)", "Base de datos de pedidos y catálogo", "Fuera de Colombia"],
              ["Proveedor de alojamiento web", "Servidores del sitio", "Puede estar fuera de Colombia"],
              ["Cloudinary", "Entrega de las imágenes del sitio", "Estados Unidos"],
              ["Google (Google Analytics)", "Medición del uso del sitio, solo si la aceptas", "Estados Unidos"],
              ["Meta Platforms (píxel de Meta y WhatsApp)", "Medición de campañas, solo si la aceptas, y mensajería por WhatsApp", "Estados Unidos"],
            ],
          },
          { type: "p", text: "También entregamos datos a las autoridades cuando la ley lo exige." },
        ],
      },
      {
        id: "transferencias",
        title: "Datos fuera de Colombia",
        blocks: [
          {
            type: "p",
            text: "Algunos de estos proveedores guardan datos fuera de Colombia, principalmente en Estados Unidos. Solo trabajamos con proveedores que ofrecen un nivel adecuado de protección y contratos de tratamiento de datos, conforme al artículo 26 de la Ley 1581 de 2012 y a las instrucciones de la Superintendencia de Industria y Comercio. Al aceptar esta política autorizas esa transmisión.",
          },
          {
            type: "p",
            text: "Puedes conocer cómo tratan los datos Google y Meta en sus propias políticas: [privacidad de Google](https://policies.google.com/privacy) y [política de privacidad de Meta](https://www.facebook.com/privacy/policy).",
          },
        ],
      },
      {
        id: "derechos",
        title: "Tus derechos",
        blocks: [
          { type: "p", text: "Como titular de los datos tienes derecho a (Ley 1581 de 2012, art. 8):" },
          {
            type: "list",
            items: [
              "Conocer, actualizar y rectificar tus datos.",
              "Pedir prueba de la autorización que nos diste.",
              "Saber, si lo pides, qué uso le hemos dado a tus datos.",
              "Presentar quejas ante la Superintendencia de Industria y Comercio, después de hacer el trámite de consulta o reclamo con nosotros.",
              "Revocar la autorización o pedir que borremos tus datos, cuando no tengamos un deber legal o contractual de conservarlos.",
              "Acceder gratis a tus datos.",
            ],
          },
        ],
      },
      {
        id: "como-ejercerlos",
        title: "Cómo ejercerlos",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Consultas",
                body: `Si quieres saber qué datos tenemos y cómo los usamos, escríbenos a **${company.privacyEmail}**. Respondemos en un máximo de 10 días hábiles; si necesitamos más tiempo te avisamos, y la respuesta no pasará de 5 días hábiles más.`,
              },
              {
                title: "Reclamos",
                body: `Para corregir, actualizar o borrar tus datos, revocar la autorización o reportar un incumplimiento, escríbenos a **${company.privacyEmail}** con tu nombre e identificación, la descripción de lo que pides, tu dirección o correo de respuesta y los documentos que quieras hacer valer.`,
              },
              {
                title: "Respuesta",
                body: "Si al reclamo le falta información, te pedimos completarla dentro de los 5 días siguientes; si pasan 2 meses sin que lo hagas, entendemos que desististe. Respondemos en un máximo de 15 días hábiles; si necesitamos más tiempo te avisamos, y la respuesta no pasará de 8 días hábiles más.",
              },
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies y tecnologías similares",
        blocks: [
          {
            type: "p",
            text: "Las cookies y el almacenamiento local son pequeños archivos que el sitio guarda en tu navegador. Usamos las necesarias para que la tienda funcione y, solo si las aceptas, las de analítica y publicidad.",
          },
          {
            type: "table",
            head: ["Nombre", "Proveedor", "Para qué", "Duración", "Tipo"],
            rows: [
              [`${ctx.storeSlug}.cart.v2`, `${company.tradeName} (almacenamiento local)`, "Guarda tu bolsa", "Hasta que la vacíes", "Necesaria"],
              [`${ctx.storeSlug}.consent.v1`, `${company.tradeName} (almacenamiento local)`, "Recuerda tu elección de cookies", "12 meses", "Necesaria"],
              ["_ga, _ga_<ID>", "Google Analytics", "Distingue visitas y sesiones para medir el uso del sitio", "2 años", "Analítica"],
              ["_fbp", "Meta", "Mide el resultado de las campañas y anuncios", "3 meses", "Publicidad"],
            ],
          },
          {
            type: "p",
            text: "Puedes cambiar tu elección cuando quieras desde **Preferencias de cookies**, al pie de cada página, o borrar las cookies desde la configuración de tu navegador. Rechazarlas no te impide comprar.",
          },
        ],
      },
      {
        id: "seguridad",
        title: "Seguridad",
        blocks: [
          {
            type: "p",
            text: "Aplicamos medidas técnicas y administrativas razonables para proteger tus datos: conexión cifrada (HTTPS), acceso restringido a la información y proveedores con estándares de seguridad reconocidos.",
          },
          {
            type: "p",
            text: "Ningún sistema es infalible. Si detectamos un incidente que afecte tus datos, te lo informaremos y lo reportaremos a la Superintendencia de Industria y Comercio.",
          },
        ],
      },
      {
        id: "conservacion",
        title: "Cuánto tiempo los guardamos",
        blocks: [
          {
            type: "p",
            text: "Guardamos tus datos mientras sean necesarios para las finalidades de esta política. Los datos de las compras se conservan durante el tiempo que exigen las normas contables y tributarias: hasta 10 años (Código de Comercio, art. 60). Los de cookies, durante el tiempo indicado en la tabla.",
          },
          { type: "p", text: `Nuestras bases de datos estarán vigentes mientras ${company.tradeName} esté en operación.` },
        ],
      },
      {
        id: "menores",
        title: "Menores de edad",
        blocks: [{ type: "p", text: "El sitio no está dirigido a menores de edad y no recogemos sus datos de forma intencional." }],
      },
      {
        id: "vigencia",
        title: "Cambios y vigencia",
        blocks: [
          {
            type: "p",
            text: `Esta política rige desde el ${longDate(LEGAL_EFFECTIVE_DATE)}. Si hacemos cambios importantes, los publicaremos en este sitio antes de aplicarlos.`,
          },
        ],
      },
    ],
  };
}
