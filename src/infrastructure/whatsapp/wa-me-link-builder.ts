import type { WhatsAppContext, WhatsAppLinkBuilder } from "@/application/ports/whatsapp-link-builder";
import { fill } from "@/application/lib/template";

const DIGITS = /^\d{8,15}$/;

/**
 * Construye deep links `https://wa.me/<numero>?text=<mensaje>`.
 * PENDIENTE (handoff §7): el número aún no está definido; sin él devuelve null.
 */
export class WaMeLinkBuilder implements WhatsAppLinkBuilder {
  private readonly number: string | null;

  constructor(
    number: string | undefined | null,
    private readonly templates: { product: string; generic: string; cart: string } = {
      product: "Hola, me interesa {name} (ref. {reference}). {url}",
      generic: "Hola, quiero asesoría sobre una pieza.",
      cart: "Hola, quiero cerrar por WhatsApp mi bolsa: {items}. Total {total}.",
    },
  ) {
    const clean = (number ?? "").replace(/[^\d]/g, "");
    this.number = DIGITS.test(clean) ? clean : null;
  }

  isConfigured(): boolean {
    return this.number !== null;
  }

  forProduct(ctx: WhatsAppContext): string | null {
    // Sin referencia (p. ej. un perfume) se quita la cláusula "(ref. …)" de la plantilla.
    const template = ctx.reference.trim() ? this.templates.product : this.templates.product.replace(/\s*\(?ref\.\s*\{reference\}\)?/, "");
    return this.build(fill(template, { name: ctx.name, reference: ctx.reference, url: ctx.canonicalUrl }));
  }

  forCart(summary: { readonly names: readonly string[]; readonly totalFormatted: string }): string | null {
    return this.build(fill(this.templates.cart, { items: summary.names.join(", "), total: summary.totalFormatted }));
  }

  generic(message?: string): string | null {
    return this.build(message ?? this.templates.generic);
  }

  private build(text: string): string | null {
    if (!this.number) return null;
    return `https://wa.me/${this.number}?text=${encodeURIComponent(text)}`;
  }
}
