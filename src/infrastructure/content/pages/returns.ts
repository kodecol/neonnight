import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, type PageContext } from "./context";
import { contactChannels } from "./shared";

export function returnsPage(ctx: PageContext): InfoPage {
  const { policies, company } = ctx;
  const days = `${policies.returnDays} días calendario`;
  const legal = `${policies.retractBusinessDays} días hábiles`;
  return {
    slug: "devoluciones",
    layout: "legal",
    kicker: "Ayuda",
    title: "Cambios y devoluciones",
    description: `Tienes ${days} desde la entrega para devolver o cambiar tu pieza. Derecho de retracto, condiciones, reembolsos y reversión del pago en ${company.tradeName}.`,
    lead: `Tienes ${days} desde la entrega para devolver o cambiar una pieza, aunque la ley solo exige ${legal}.`,
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
              { label: "Plazo", value: `${days} desde la entrega` },
              { label: "Reembolso", value: `Por el mismo medio de pago, en máximo ${policies.refundMaxDays} días calendario` },
              { label: "Envío de vuelta", value: "A tu cargo, salvo si la pieza llegó con un defecto o no corresponde a tu pedido" },
              { label: "Retracto legal", value: `${legal} (Ley 1480 de 2011, art. 47)` },
            ],
          },
        ],
      },
      {
        id: "retracto",
        title: "Tu derecho de retracto",
        blocks: [
          {
            type: "p",
            text: `En las compras a distancia puedes retractarte dentro de los ${legal} siguientes a la entrega, sin tener que dar explicaciones (Ley 1480 de 2011, art. 47).`,
          },
          {
            type: "p",
            text: `Nosotros ampliamos ese plazo a **${days} desde la entrega**, o a los ${legal} de ley si fueran más, con las mismas condiciones.`,
          },
          {
            type: "p",
            text: `Si te retractas, te devolvemos todo lo que pagaste, sin descuentos ni retenciones, en un máximo de ${policies.refundMaxDays} días calendario. El único costo a tu cargo es el transporte de vuelta.`,
          },
        ],
      },
      {
        id: "condiciones",
        title: "Condiciones para devolver",
        blocks: [
          {
            type: "list",
            items: [
              "La pieza debe estar sin uso y en el mismo estado en que la recibiste.",
              "Con todo lo que venía: estuche, caja, documentos, tarjetas de garantía, eslabones sobrantes, etiquetas y plásticos o adhesivos de protección.",
              "En perfumes, con el celofán y los sellos intactos.",
            ],
          },
        ],
      },
      {
        id: "excepciones",
        title: "Qué no se puede devolver",
        blocks: [
          { type: "p", text: "La ley excluye del retracto algunos casos (Ley 1480 de 2011, art. 47). En Neon Night son estos:" },
          {
            type: "list",
            items: [
              "**Piezas personalizadas o ajustadas a tu medida:** grabados, cambios de talla de anillos y ajustes de brazalete hechos a tu pedido.",
              "**Perfumes abiertos o con el sello roto:** son bienes de uso personal y, una vez abiertos, no pueden volver a venderse.",
            ],
          },
          { type: "p", text: "Tampoco recibimos piezas con señales de uso, daños o faltantes posteriores a la entrega." },
          { type: "note", text: "Nada de esto afecta tu [garantía](/garantia): si una de estas piezas llega con un defecto, la cubrimos igual." },
        ],
      },
      {
        id: "como-devolver",
        title: "Cómo devolver",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Escríbenos dentro del plazo", body: `Contáctanos ${contactChannels(ctx)} con tu número de pedido y dinos si prefieres reembolso o cambio.` },
              {
                title: "Envíanos la pieza",
                body: `Te damos la dirección y las instrucciones. Envíala asegurada por su valor total. Si prefieres, generamos la guía de ${policies.shipping.carrier} por ti y te decimos el costo antes de enviarla.`,
              },
              { title: "La revisamos", body: "Cuando la recibimos verificamos que cumpla las condiciones y te confirmamos por escrito." },
              {
                title: "Te devolvemos el dinero",
                body: `Reembolsamos por el mismo medio con que pagaste, en un máximo de ${policies.refundMaxDays} días calendario desde que ejerciste el retracto. En tarjeta, el abono aparece en tu extracto según los tiempos de tu banco; en PSE o Nequi, lo transferimos a una cuenta a nombre de quien pagó.`,
              },
            ],
          },
        ],
      },
      {
        id: "cambios",
        title: "Cambios",
        blocks: [
          {
            type: "p",
            text: "Si prefieres otra pieza, dentro del mismo plazo puedes cambiarla por cualquier otra disponible. Si cuesta más, pagas la diferencia; si cuesta menos, te devolvemos la diferencia. El envío de la pieza nueva corre por nuestra cuenta.",
          },
        ],
      },
      {
        id: "problema-al-recibir",
        title: "Si la pieza llegó con un problema",
        blocks: [
          {
            type: "p",
            text: "Si llegó dañada, con un defecto o no es la que compraste, nada de lo anterior aplica: escríbenos apenas la recibas, la recogemos sin costo y eliges entre el cambio, la reparación o el reembolso total. Consulta también la [garantía](/garantia).",
          },
        ],
      },
      {
        id: "reversion",
        title: "Reversión del pago",
        blocks: [
          {
            type: "p",
            text: "Si pagaste con tarjeta de crédito o débito, PSE u otro medio electrónico, puedes pedir la reversión del pago en estos casos (Ley 1480 de 2011, art. 51, y Decreto 1074 de 2015):",
          },
          {
            type: "list",
            items: [
              "Fuiste víctima de fraude.",
              "La operación no fue solicitada por ti.",
              "No recibiste la pieza.",
              "La pieza que recibiste no corresponde a lo que pediste o es defectuosa.",
            ],
          },
          {
            type: "steps",
            items: [
              { title: "Avísanos", body: `Dentro de los 5 días hábiles siguientes a la fecha en que supiste de la situación, preséntanos tu queja al correo **${company.email}**.` },
              { title: "Avisa a tu banco", body: "En el mismo plazo, pide la reversión al emisor del medio de pago: el banco o la entidad de tu tarjeta, PSE o billetera." },
              { title: "Devuelve la pieza", body: "Si la pediste porque la pieza no corresponde o es defectuosa, debes devolvérnosla en las mismas condiciones en que la recibiste." },
            ],
          },
        ],
      },
    ],
  };
}
