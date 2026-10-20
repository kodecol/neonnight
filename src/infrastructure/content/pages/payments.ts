import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, type PageContext } from "./context";
import { contactChannels, shippingCostText } from "./shared";

export function paymentsPage(ctx: PageContext): InfoPage {
  return {
    slug: "pagos",
    layout: "legal",
    kicker: "Ayuda",
    title: "Pagos",
    description: "Paga con tarjeta de crédito o débito, PSE, Nequi o Botón Bancolombia a través de Bold. Neon Night nunca ve ni guarda los datos de tu tarjeta.",
    lead: "Los pagos los procesa Bold, una pasarela colombiana. Eliges el medio al finalizar la compra y nosotros nunca vemos los datos de tu tarjeta.",
    updatedAt: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      {
        id: "medios",
        title: "Medios de pago",
        blocks: [
          { type: "p", text: "Aceptamos los medios que Bold habilite en el checkout. Hoy son estos:" },
          {
            type: "table",
            head: ["Medio", "Tipo"],
            rows: [
              ["Visa", "Tarjeta de crédito y débito"],
              ["Mastercard", "Tarjeta de crédito y débito"],
              ["American Express", "Tarjeta de crédito"],
              ["PSE", "Débito desde tu cuenta en cualquier banco"],
              ["Nequi", "Billetera digital"],
              ["Botón Bancolombia", "Pago desde tu cuenta Bancolombia"],
            ],
          },
          {
            type: "p",
            text: "Las cuotas con tarjeta de crédito las define tu banco. Si prefieres otro medio, escríbenos antes de comprar y te contamos qué alternativas tenemos.",
          },
        ],
      },
      {
        id: "seguridad",
        title: "Seguridad",
        blocks: [
          {
            type: "list",
            items: [
              "Al finalizar la compra pasas al checkout de [Bold](https://bold.co), que procesa el pago con los estándares de seguridad de la industria de tarjetas.",
              "**Neon Night no ve ni guarda** los datos de tu tarjeta ni las claves de tu banco.",
              "Toda la navegación en el sitio va por conexión cifrada (HTTPS).",
              "Nunca te pediremos datos de tarjeta, claves ni códigos por WhatsApp, correo o teléfono. Si alguien lo hace a nombre nuestro, no los compartas y avísanos.",
            ],
          },
        ],
      },
      {
        id: "confirmacion",
        title: "Cuándo queda confirmado tu pedido",
        blocks: [
          {
            type: "p",
            text: "Tu compra queda confirmada cuando Bold **aprueba el pago**. En ese momento ves la confirmación con tu número de pedido, Bold te envía el comprobante y nosotros te contactamos para coordinar la entrega.",
          },
          {
            type: "p",
            text: "Agregar una pieza a la bolsa no la reserva. La pieza queda apartada para ti solo cuando el pago se aprueba: muchas son únicas y otra persona podría comprarla antes.",
          },
          {
            type: "table",
            head: ["Estado del pago", "Qué significa"],
            rows: [
              ["Aprobado", "Tu pedido está confirmado y empezamos a prepararlo."],
              ["Pendiente", "El banco o la pasarela aún lo están verificando. Te avisamos apenas cambie; no lo intentes de nuevo para no pagar dos veces."],
              ["Rechazado", "No se hizo ningún cobro. Puedes intentarlo con otro medio o escribirnos para ayudarte."],
            ],
          },
        ],
      },
      {
        id: "precios",
        title: "Precios, envío y factura",
        blocks: [
          {
            type: "list",
            items: [
              "Los precios están en pesos colombianos (COP) e incluyen los impuestos aplicables.",
              "Pagas el precio publicado al momento de la compra (Ley 1480 de 2011, art. 26).",
              `El envío dentro de Colombia es ${shippingCostText(ctx)}: el total que ves en la bolsa es lo que pagas.`,
              "Te enviamos la factura o el soporte de venta que corresponda.",
            ],
          },
        ],
      },
      {
        id: "reversion",
        title: "Reversión del pago",
        blocks: [
          {
            type: "p",
            text: "Si pagaste con un medio electrónico y fuiste víctima de fraude, la operación no fue solicitada, no recibiste la pieza o la que recibiste no corresponde a lo que pediste o es defectuosa, puedes pedir la reversión del pago. Te explicamos cómo en [cambios y devoluciones](/devoluciones#reversion).",
          },
        ],
      },
      {
        id: "contacto",
        title: "¿Problemas con un pago?",
        blocks: [{ type: "p", text: `Escríbenos ${contactChannels(ctx)}, con tu número de pedido o la referencia de Bold.` }],
      },
    ],
  };
}
