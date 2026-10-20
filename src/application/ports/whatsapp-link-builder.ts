export interface WhatsAppContext {
  readonly name: string;
  readonly reference: string;
  readonly canonicalUrl: string;
}

export interface WhatsAppLinkBuilder {
  /** Devuelve null si el número aún no está configurado. */
  forProduct(ctx: WhatsAppContext): string | null;
  forCart(summary: { readonly names: readonly string[]; readonly totalFormatted: string }): string | null;
  generic(message?: string): string | null;
  isConfigured(): boolean;
}
