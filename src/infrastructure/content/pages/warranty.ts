import type { InfoPage } from "@/application/dto/info-page.dto";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, type PageContext } from "./context";
import { contactChannels } from "./shared";

export function warrantyPage(ctx: PageContext): InfoPage {
  const { policies, company } = ctx;
  const months = `${policies.warrantyMonths} meses`;
  return {
    slug: "garantia",
    layout: "legal",
    kicker: "Ayuda",
    title: "Garantía",
    description: `Todas las piezas de ${company.tradeName} son nuevas y tienen garantía de ${months} desde la entrega: qué cubre, qué no y cómo hacerla efectiva.`,
    lead: `Todas nuestras piezas son nuevas y tienen garantía de ${months} desde la entrega. Respondemos nosotros directamente, sin intermediarios.`,
    updatedAt: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      {
        id: "que-es",
        title: "Qué es y cuánto dura",
        blocks: [
          {
            type: "p",
            text: "La garantía legal es nuestra obligación de responder por la calidad, la idoneidad, la seguridad y el buen estado de lo que vendemos (Ley 1480 de 2011, arts. 7 y 8).",
          },
          {
            type: "p",
            text: `Nuestra garantía es de **${months} contados desde la fecha de entrega**, igual para relojes, joyas y perfumes. No tiene costo, no hay que registrarla y la respaldamos nosotros: aunque la pieza sea de otra casa, tu reclamo lo atiende ${company.tradeName}.`,
          },
        ],
      },
      {
        id: "que-cubre",
        title: "Qué cubre",
        blocks: [
          {
            type: "table",
            head: ["Línea", "Cubre"],
            rows: [
              [
                "Relojería",
                "Funcionamiento del movimiento (automático, manual o de cuarzo); precisión dentro de las tolerancias de la casa; hermeticidad según la resistencia al agua indicada; corona, pulsadores, bisel, cierre y brazalete por defectos de fabricación.",
              ],
              ["Joyería", "Defectos de fabricación en cierres, broches, engastes, soldaduras y articulaciones, y piedras que se suelten por falla del engaste."],
              ["Perfumería", "Atomizador o válvula que no funcione, fugas, frasco defectuoso y alteración del contenido que no se deba a un mal almacenamiento."],
            ],
          },
          {
            type: "note",
            text: "La autenticidad no tiene plazo: si alguna vez una pieza que te vendimos no fuera auténtica, te devolvemos el 100 % de lo pagado.",
          },
        ],
      },
      {
        id: "que-no-cubre",
        title: "Qué no cubre",
        blocks: [
          {
            type: "p",
            text: "La garantía no aplica cuando el daño se debe a fuerza mayor o caso fortuito, al hecho de un tercero, al uso indebido de la pieza o a no seguir sus instrucciones de uso y cuidado (Ley 1480 de 2011, art. 16). En la práctica, no cubre:",
          },
          {
            type: "list",
            items: [
              "Golpes, caídas, aplastamientos y sus consecuencias.",
              "Rayones y desgaste normal por uso: correas, brazaletes, baños de metal y pulido.",
              "Humedad dentro de un reloj usado por encima de su resistencia al agua, con la corona sin enroscar, o después de que un tercero lo haya abierto.",
              "Magnetización por exposición a campos magnéticos. Tiene arreglo y te ayudamos a resolverlo.",
              "Aperturas, reparaciones, ajustes o cambios de piezas hechos por terceros que no hayamos autorizado.",
              "En joyas: deformaciones por golpes o presión, piedras perdidas por impacto y daños por contacto con químicos como cloro, cremas o perfumes.",
              "En perfumes: alteraciones por calor, luz directa o mal almacenamiento, y las variaciones normales entre lotes.",
            ],
          },
        ],
      },
      {
        id: "como-reclamar",
        title: "Cómo hacerla efectiva",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Escríbenos", body: `Contáctanos ${contactChannels(ctx)} con tu número de pedido, una descripción de la falla y, si puedes, fotos o un video.` },
              {
                title: "Recogemos la pieza",
                body: `Coordinamos la recogida con ${policies.shipping.carrier}, asegurada y por nuestra cuenta. Al recibirla te enviamos una constancia con la fecha, el estado de la pieza y la falla reportada.`,
              },
              { title: "Diagnóstico y respuesta", body: "Te respondemos en un máximo de **15 días hábiles** desde que recibimos la reclamación, con el diagnóstico y sus soportes (Decreto 1074 de 2015)." },
              {
                title: "Reparación o solución",
                body: "Si la garantía aplica, reparamos sin costo en un máximo de 30 días hábiles y te devolvemos la pieza asegurada, también sin costo.",
              },
            ],
          },
          {
            type: "p",
            text: "Si la reparación no es posible, o si la falla se repite después de repararla, eliges tú: una nueva reparación, el cambio por una pieza igual o equivalente, o la devolución del dinero (Ley 1480 de 2011, art. 11).",
          },
          { type: "p", text: "El tiempo que la pieza esté en reparación se suma al plazo de la garantía." },
        ],
      },
      {
        id: "garantia-del-fabricante",
        title: "Garantía del fabricante",
        blocks: [
          {
            type: "p",
            text: "Cuando la pieza trae tarjeta o certificado de garantía de la casa, te lo entregamos con ella. Algunas casas condicionan su garantía internacional a que la compra se haya hecho en su red oficial; como revendedor independiente, no podemos asegurarte que la honren.",
          },
          {
            type: "p",
            text: `Por eso nuestra garantía de ${months} no depende de la de la casa: sea cual sea la respuesta del fabricante, respondemos nosotros.`,
          },
        ],
      },
      {
        id: "cuidados",
        title: "Cuidados recomendados",
        blocks: [
          {
            type: "list",
            items: [
              "**Relojes:** enrosca la corona antes de cualquier contacto con el agua, no uses los pulsadores bajo el agua y aléjalos de imanes, parlantes y electrodomésticos. Los relojes mecánicos necesitan mantenimiento periódico según la recomendación de la casa.",
              "**Joyas:** quítatelas para nadar, hacer deporte o limpiar, y guárdalas por separado para que no se rayen. Aplica cremas y perfume antes de ponértelas.",
              "**Perfumes:** guárdalos lejos del sol, del calor y de la humedad, con la tapa puesta.",
            ],
          },
        ],
      },
    ],
  };
}
