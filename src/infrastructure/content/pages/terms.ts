import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, type PageContext } from "./context";
import { contactChannels, identityFacts, shippingCostText } from "./shared";

export function termsPage(ctx: PageContext): InfoPage {
  const { company, policies } = ctx;
  return {
    slug: "terminos",
    layout: "legal",
    kicker: "Legal",
    title: "Términos y condiciones",
    description: `Condiciones de compra en ${company.tradeName}: quiénes somos, productos, precios, pagos, entregas, garantía, retracto y atención de peticiones, quejas y reclamos.`,
    lead: "Estas son las reglas de las compras en este sitio. Las escribimos para que se entiendan y para que sepas exactamente qué puedes esperar de nosotros.",
    updatedAt: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      {
        id: "quienes-somos",
        title: "Quiénes somos",
        blocks: [{ type: "facts", items: identityFacts(ctx) }],
      },
      {
        id: "aceptacion",
        title: "Aceptación",
        blocks: [
          {
            type: "p",
            text: "Estos términos regulan las compras que hagas en este sitio. Al finalizar una compra declaras que los leíste y los aceptas, junto con la [política de privacidad](/privacidad).",
          },
          { type: "p", text: "Para comprar debes ser mayor de edad y tener capacidad legal para contratar." },
        ],
      },
      {
        id: "productos",
        title: "Productos",
        blocks: [
          {
            type: "list",
            items: [
              "Vendemos relojes, joyas y perfumes **nuevos y auténticos**. Cada ficha indica la marca, la referencia, las especificaciones, la presentación y lo que incluye.",
              "Las fotos muestran la pieza o su modelo. Si quieres ver la pieza exacta que vas a recibir, te enviamos un video por WhatsApp antes de que compres.",
              "Los perfumes se venden en su empaque original sellado.",
              "Somos un revendedor independiente: no estamos afiliados a las marcas que vendemos ni actuamos en su nombre. Las marcas y logotipos pertenecen a sus titulares y los usamos solo para identificar los productos.",
            ],
          },
        ],
      },
      {
        id: "precios",
        title: "Precios",
        blocks: [
          {
            type: "p",
            text: `Los precios están en pesos colombianos (COP) e incluyen los impuestos aplicables. El envío dentro de Colombia es ${shippingCostText(ctx)}. Pagas el precio publicado al momento de la compra (Ley 1480 de 2011, art. 26).`,
          },
          { type: "p", text: "Podemos cambiar los precios en cualquier momento, pero el cambio nunca afecta una compra ya pagada." },
        ],
      },
      {
        id: "disponibilidad",
        title: "Disponibilidad",
        blocks: [
          {
            type: "p",
            text: "Muchas piezas son únicas o tienen existencias limitadas. Agregar una pieza a la bolsa no la reserva: queda apartada para ti cuando el pago se aprueba.",
          },
          {
            type: "p",
            text: `Si por un error una pieza pagada no estuviera disponible, te avisamos de inmediato y te devolvemos todo el dinero en un máximo de ${policies.refundMaxDays} días calendario, o te ofrecemos una alternativa si la prefieres.`,
          },
        ],
      },
      {
        id: "pagos",
        title: "Pagos",
        blocks: [
          {
            type: "p",
            text: "Los pagos se procesan con Bold, una pasarela de pagos colombiana. Aceptamos los medios que Bold habilite en el checkout; los detalles están en [pagos](/pagos). Nunca vemos ni guardamos los datos de tu tarjeta.",
          },
          {
            type: "p",
            text: "Si cierras la compra por WhatsApp, te indicamos los medios de pago disponibles. Las mismas condiciones de estos términos aplican a esa compra.",
          },
        ],
      },
      {
        id: "como-se-forma-el-contrato",
        title: "Cómo se forma la compra",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Eliges", body: "Agregas a la bolsa las piezas y presentaciones que quieres, y revisas el resumen con los precios y el total." },
              { title: "Pagas", body: "Al finalizar pasas al checkout de Bold y eliges el medio de pago." },
              {
                title: "Confirmamos",
                body: "La compra queda confirmada cuando Bold aprueba el pago. Ves la confirmación con tu número de pedido, Bold te envía el comprobante y nosotros te contactamos para coordinar la entrega.",
              },
            ],
          },
          {
            type: "p",
            text: "Los mensajes y registros electrónicos de la compra tienen plena validez como prueba (Ley 527 de 1999).",
          },
        ],
      },
      {
        id: "entrega",
        title: "Entrega",
        blocks: [
          {
            type: "p",
            text: `Enviamos a toda Colombia con ${policies.shipping.carrier}. La entrega nunca supera los ${policies.shipping.maxDays} días calendario desde la compra (Ley 1480 de 2011, art. 50). Plazos y condiciones en [envíos](/envios).`,
          },
        ],
      },
      {
        id: "garantia",
        title: "Garantía",
        blocks: [
          {
            type: "p",
            text: `Todas las piezas tienen garantía de ${policies.warrantyMonths} meses desde la entrega, que respaldamos directamente. Qué cubre y cómo reclamarla, en [garantía](/garantia).`,
          },
        ],
      },
      {
        id: "retracto",
        title: "Retracto, devoluciones y reversión del pago",
        blocks: [
          {
            type: "p",
            text: `Tienes ${policies.returnDays} días calendario desde la entrega para devolver o cambiar tu pieza, más que los ${policies.retractBusinessDays} días hábiles del derecho de retracto (Ley 1480 de 2011, art. 47). También puedes pedir la reversión del pago en los casos del artículo 51. Todo el detalle, en [cambios y devoluciones](/devoluciones).`,
          },
        ],
      },
      {
        id: "pqr",
        title: "Peticiones, quejas y reclamos",
        blocks: [
          { type: "p", text: `Escríbenos ${contactChannels(ctx)}. Respondemos en un máximo de 15 días hábiles.` },
          {
            type: "p",
            text: "Si no quedas satisfecho con nuestra respuesta, puedes acudir a la Superintendencia de Industria y Comercio, autoridad de protección al consumidor: [sic.gov.co](https://www.sic.gov.co).",
          },
        ],
      },
      {
        id: "propiedad-intelectual",
        title: "Propiedad intelectual",
        blocks: [
          {
            type: "p",
            text: `Los textos, el diseño, el logotipo y el contenido propio de este sitio pertenecen a ${company.tradeName}. No los copies ni los uses con fines comerciales sin nuestra autorización. Las marcas de terceros pertenecen a sus titulares.`,
          },
        ],
      },
      {
        id: "uso-del-sitio",
        title: "Uso del sitio",
        blocks: [
          {
            type: "p",
            text: "Te pedimos usar el sitio de buena fe: no intentes acceder a zonas restringidas, alterar su funcionamiento ni hacer compras a nombre de otra persona sin su autorización.",
          },
        ],
      },
      {
        id: "datos-personales",
        title: "Datos personales",
        blocks: [{ type: "p", text: "Tratamos tus datos según nuestra [política de privacidad y cookies](/privacidad)." }],
      },
      {
        id: "cambios",
        title: "Cambios a estos términos",
        blocks: [
          {
            type: "p",
            text: "Podemos actualizar estos términos. A cada compra se le aplica la versión vigente el día en que la hiciste. Arriba indicamos la fecha de vigencia y la versión.",
          },
        ],
      },
      {
        id: "ley-aplicable",
        title: "Ley aplicable",
        blocks: [
          {
            type: "p",
            text: "Estos términos se rigen por las leyes de Colombia, en especial la Ley 1480 de 2011 (Estatuto del Consumidor), la Ley 527 de 1999 (comercio electrónico) y la Ley 1581 de 2012 (protección de datos personales).",
          },
        ],
      },
    ],
  };
}
