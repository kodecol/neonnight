import type { WhatsAppContext, WhatsAppLinkBuilder } from "@/application/ports/whatsapp-link-builder";

const DIGITS = /^\d{8,15}$/;

/**
 * Construye deep links `https://wa.me/<numero>?text=<mensaje>`.
 * PENDIENTE (handoff §7): el número aún no está definido; sin él devuelve null.
 */
export class WaMeLinkBuilder implements WhatsAppLinkBuilder {
  private readonly number: string | null;

  constructor(number: string | undefined | null) {
    const clean = (number ?? "").replace(/[^\d]/g, "");
    this.number = DIGITS.test(clean) ? clean : null;
  }

  isConfigured(): boolean {
    return this.number !== null;
  }

  forWatch(ctx: WhatsAppContext): string | null {
    return this.build(`Hola, me interesa el ${ctx.name} (ref. ${ctx.reference}). ${ctx.canonicalUrl}`);
  }

  forCart(summary: { readonly names: readonly string[]; readonly totalFormatted: string }): string | null {
    const list = summary.names.join(", ");
    return this.build(`Hola, quiero cerrar por WhatsApp mi bolsa: ${list}. Total ${summary.totalFormatted}.`);
  }

  generic(message = "Hola, quiero asesoría sobre una pieza de Neon Night."): string | null {
    return this.build(message);
  }

  private build(text: string): string | null {
    if (!this.number) return null;
    return `https://wa.me/${this.number}?text=${encodeURIComponent(text)}`;
  }
}
