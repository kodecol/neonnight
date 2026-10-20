import { whatsappLabel, type PageContext } from "./context";

/** Identidad del vendedor (Ley 1480, art. 50). El propietario solo aparece si está registrado. */
export function identityFacts(ctx: PageContext): Array<{ label: string; value: string }> {
  const { company } = ctx;
  return [
    { label: "Nombre comercial", value: company.tradeName },
    { label: "Naturaleza", value: company.legalForm },
    { label: "Matrícula mercantil", value: `${company.registry.number} · ${company.registry.chamber}` },
    ...(company.owner
      ? [
          { label: "Propietario", value: company.owner.name },
          { label: "NIT o cédula", value: company.owner.taxId },
        ]
      : []),
    { label: "Domicilio", value: `${company.city}, ${company.country}` },
    { label: "Modalidad", value: "Tienda en línea con envíos a todo el país" },
    { label: "Correo", value: company.email },
    { label: "WhatsApp", value: ctx.whatsapp ?? "Botón de WhatsApp del sitio" },
    { label: "Horario de atención", value: company.hours },
  ];
}

/** Cuándo sale el pedido tras el pago aprobado. */
export function handlingText(ctx: PageContext): string {
  const days = ctx.policies.shipping.handlingDays;
  return days === 1 ? "al siguiente día hábil" : `dentro de los ${days} días hábiles siguientes`;
}

/** "sin costo" o la alternativa si algún día el envío se cobra. */
export function shippingCostText(ctx: PageContext): string {
  return ctx.policies.shipping.free ? "sin costo" : "con el costo que ves antes de pagar";
}

/** Canales de contacto en una frase: "por WhatsApp +57 … o al correo …". */
export function contactChannels(ctx: PageContext, email = ctx.company.email): string {
  return `por ${whatsappLabel(ctx)} o al correo **${email}**`;
}
