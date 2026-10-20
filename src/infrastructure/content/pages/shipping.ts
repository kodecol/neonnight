import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, range, type PageContext } from "./context";
import { contactChannels, handlingText, shippingCostText } from "./shared";

export function shippingPage(ctx: PageContext): InfoPage {
  const { shipping } = ctx.policies;
  const cost = shippingCostText(ctx);
  return {
    slug: "envios",
    layout: "legal",
    kicker: "Ayuda",
    title: "Envíos",
    description: `Envíos asegurados ${cost} a toda Colombia con ${shipping.carrier}: despacho ${handlingText(ctx)} y entrega en ${range(shipping.transitMain)} días hábiles en ciudades principales.`,
    lead: `Despachamos a toda Colombia con ${shipping.carrier}, asegurado por el valor total de la pieza y ${cost} para ti.`,
    updatedAt: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      {
        id: "resumen",
        title: "En resumen",
        blocks: [
          {
            type: "facts",
            items: [
              { label: "Transportadora", value: shipping.carrier },
              { label: "Costo", value: shipping.free ? "Sin costo" : "Se informa antes de pagar" },
              { label: "Despacho", value: `${handlingText(ctx).replace(/^./, (c) => c.toUpperCase())} después de aprobado el pago` },
              { label: "Ciudades principales", value: `${range(shipping.transitMain)} días hábiles` },
              { label: "Resto del país", value: `${range(shipping.transitOther)} días hábiles` },
              { label: "Seguro", value: "Por el valor total de la pieza" },
              { label: "Cobertura", value: "Todo el territorio colombiano" },
            ],
          },
          {
            type: "p",
            text: "Por ahora no hacemos envíos fuera de Colombia. Somos una tienda en línea y no tenemos punto de recogida: todas las entregas se hacen en la dirección que nos indiques.",
          },
        ],
      },
      {
        id: "despacho",
        title: "Cuándo sale tu pedido",
        blocks: [
          {
            type: "p",
            text: `Preparamos tu pedido en cuanto Bold confirma el pago y lo despachamos ${handlingText(ctx)}. Si el pago se aprueba un sábado, domingo o festivo, contamos desde el siguiente día hábil.`,
          },
          {
            type: "p",
            text: "Antes de despachar revisamos la pieza una última vez y la empacamos con su estuche, sus documentos y todos sus accesorios.",
          },
        ],
      },
      {
        id: "plazos",
        title: "Plazos de entrega",
        blocks: [
          {
            type: "table",
            head: ["Destino", "Tiempo estimado desde el despacho"],
            rows: [
              ["Bogotá y ciudades principales", `${range(shipping.transitMain)} días hábiles`],
              ["Otros municipios", `${range(shipping.transitOther)} días hábiles`],
              ["Zonas de difícil acceso o con trayecto especial", "Te confirmamos el plazo antes de despachar"],
            ],
          },
          {
            type: "p",
            text: `Son plazos estimados de ${shipping.carrier} y pueden variar por causas ajenas a nosotros, como el clima, cierres de vías o situaciones de orden público. Si hay un retraso, te avisamos.`,
          },
          {
            type: "note",
            text: `En ningún caso la entrega superará los **${shipping.maxDays} días calendario** contados desde el día siguiente a la compra (Ley 1480 de 2011, art. 50). Si no podemos cumplir, puedes cancelar el pedido y te devolvemos todo lo que pagaste.`,
          },
        ],
      },
      {
        id: "seguimiento",
        title: "Seguimiento",
        blocks: [
          {
            type: "p",
            text: `Cuando despachamos te enviamos el número de guía de ${shipping.carrier}. Con él puedes seguir el envío en [coordinadora.com](https://www.coordinadora.com) o preguntarnos en cualquier momento.`,
          },
        ],
      },
      {
        id: "entrega",
        title: "Entrega",
        blocks: [
          {
            type: "list",
            items: [
              "Entregamos en la dirección que nos indicaste, a ti o a la persona que autorices.",
              "Por seguridad, la transportadora puede pedir el documento de identidad de quien recibe.",
              "Si no vas a estar, puedes autorizar a otra persona mayor de edad: escríbenos antes del despacho con su nombre completo.",
              "El empaque exterior es discreto: no lleva marcas que revelen lo que hay adentro.",
              `Si nadie recibe, ${shipping.carrier} intenta de nuevo. Si la entrega no es posible, la pieza vuelve a nosotros y coordinamos contigo un nuevo envío.`,
            ],
          },
        ],
      },
      {
        id: "al-recibir",
        title: "Al recibir el paquete",
        blocks: [
          {
            type: "p",
            text: "Revisa el empaque frente al mensajero. Si llega abierto, mojado o con señales de manipulación, déjalo anotado en la guía antes de firmar y escríbenos de inmediato con fotos. El envío está asegurado: lo resolvemos con la transportadora sin costo para ti.",
          },
          { type: "p", text: "Te recomendamos grabar un video corto al abrir el paquete. Si algo no está bien, nos ayuda a resolverlo más rápido." },
          {
            type: "p",
            text: "Si la pieza llega con un defecto o no es la que compraste, revisa la [garantía](/garantia) y lo que puedes hacer en [cambios y devoluciones](/devoluciones#problema-al-recibir).",
          },
        ],
      },
      {
        id: "cambio-de-direccion",
        title: "Cambio de dirección",
        blocks: [
          {
            type: "p",
            text: "Puedes cambiar la dirección de entrega sin costo mientras el pedido no haya salido. Después del despacho, el cambio depende de la transportadora y te informamos si tiene algún costo antes de hacerlo.",
          },
        ],
      },
      {
        id: "contacto",
        title: "¿Dudas sobre tu envío?",
        blocks: [{ type: "p", text: `Escríbenos ${contactChannels(ctx)}, con tu número de pedido. Horario: ${ctx.company.hours}.` }],
      },
    ],
  };
}
