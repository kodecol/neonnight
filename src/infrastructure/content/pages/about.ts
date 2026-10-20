import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, type PageContext } from "./context";
import { handlingText, identityFacts, shippingCostText } from "./shared";

export function aboutPage(ctx: PageContext): InfoPage {
  const { company, policies } = ctx;
  return {
    slug: "nosotros",
    layout: "editorial",
    kicker: "Nosotros",
    title: "Lujo verificado, sin vitrina de por medio",
    description: `${company.tradeName} es una tienda en línea de ${company.city} con relojes, joyas y perfumes de lujo nuevos y auténticos, verificados uno por uno y enviados a toda Colombia.`,
    lead: `Nacimos en ${company.city} en ${company.foundingYear} con una idea sencilla: que comprar un reloj, una joya o un perfume de una gran casa sea tan seguro en línea como en una boutique, y a un precio más justo.`,
    updatedAt: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      {
        id: "quienes-somos",
        title: "Quiénes somos",
        blocks: [
          {
            type: "p",
            text: "Somos una tienda en línea especializada en relojería, joyería y perfumería de lujo. Trabajamos solo con **piezas nuevas y auténticas** de las grandes casas, y las enviamos a todo el país.",
          },
          {
            type: "p",
            text: "No tenemos vitrina física. Eso nos permite mantener los costos bajos y trasladar la diferencia al precio. Lo que sí tenemos es un método, y lo cumplimos con cada pieza.",
          },
          {
            type: "p",
            text: `Somos un **revendedor independiente**: no estamos afiliados a las marcas que vendemos ni actuamos en su nombre. Por eso respondemos directamente por cada pieza, con nuestra propia [garantía de ${policies.warrantyMonths} meses](/garantia).`,
          },
        ],
      },
      {
        id: "como-verificamos",
        title: "Cómo verificamos cada pieza",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Referencia y serie",
                body: "Contrastamos la referencia, el número de serie o el lote con la documentación de la pieza y con las especificaciones de la casa.",
              },
              {
                title: "Revisión en mano",
                body: "Revisamos el estado real: funcionamiento y precisión en relojes; cierres, engastes y sellos en joyas; frasco, atomizador y celofán en perfumes.",
              },
              {
                title: "Video antes de comprar",
                body: "Si quieres verla antes de decidir, te enviamos por WhatsApp un video de la pieza que vas a recibir, no de una igual.",
              },
              {
                title: "Envío asegurado",
                body: `La despachamos ${handlingText(ctx)} con ${policies.shipping.carrier}, asegurada por su valor, ${shippingCostText(ctx)} y en empaque discreto. Te compartimos la guía para que la sigas.`,
              },
            ],
          },
        ],
      },
      {
        id: "compromisos",
        title: "Lo que nos comprometemos a cumplir",
        blocks: [
          {
            type: "list",
            items: [
              "**Piezas nuevas y auténticas.** Si alguna vez una pieza no fuera auténtica, te devolvemos el 100 % de lo pagado.",
              `**[Garantía de ${policies.warrantyMonths} meses](/garantia)** en todas las piezas, contada desde la entrega.`,
              `**[Envío asegurado ${shippingCostText(ctx)}](/envios)** a cualquier lugar de Colombia.`,
              `**[${policies.returnDays} días para devolver](/devoluciones)** la pieza si no es lo que esperabas.`,
              "**[Pago seguro](/pagos)** con Bold: nunca vemos ni guardamos los datos de tu tarjeta.",
            ],
          },
        ],
      },
      {
        id: "datos",
        title: "Datos de contacto",
        blocks: [
          {
            type: "facts",
            items: [...identityFacts(ctx), { label: "Fundación", value: `${company.city}, ${company.foundingYear}` }],
          },
          {
            type: "p",
            text: "¿Tienes una pregunta sobre una pieza? Escríbenos: te respondemos con calma, sin afanes ni presión. Si quieres ver todo el catálogo, empieza por [la colección](/coleccion).",
          },
        ],
      },
    ],
  };
}
