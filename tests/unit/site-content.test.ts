import { describe, expect, it } from "vitest";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { fill } from "@/application/lib/template";
import { fillStoreName } from "@/application/ports/identity-settings";
import { WaMeLinkBuilder } from "@/infrastructure/whatsapp/wa-me-link-builder";
import { SEED_LINES } from "@/infrastructure/cms/seed";
import { LINE_TEMPLATES } from "@/domain/entities/product-line";

describe("Contenido centralizado", () => {
  it("el repositorio estático devuelve el contenido", async () => {
    const c = await new StaticSiteContentRepository().get();
    // Plantilla neutra: sin marca ni redes de fábrica (las pone brand:apply o el panel).
    expect(c.brand.name).toBe("Tu tienda");
    expect(c.social.networks).toEqual([]);
    expect(JSON.stringify(c).toLowerCase()).not.toMatch(/neon ?night|neonight/);
    expect(c.home.trust.items.map((i) => i.title)).toEqual(["Verificado en mano", "Garantía de 12 meses", "Envío asegurado, sin costo"]);
    expect(c.home.payments.logos.map((l) => l.name)).toEqual(["Visa", "Mastercard", "American Express", "Bold", "PSE", "Nequi", "Bancolombia", "Daviplata"]);
    expect(c.home.testimonials.items).toEqual([]);
    expect(c.footer.columns.flatMap((col) => col.links.map((l) => l.label))).not.toContain("Financiación");
  });

  it("todas las plantillas tienen sus claves", () => {
    expect(fill(SITE_CONTENT.home.catalog.ctaTemplate, { count: 30 })).toBe("Ver las 30 piezas");
    expect(fill(SITE_CONTENT.home.hero.kickerTemplate, { brand: "Rolex" })).toBe("Rolex · Recién llegado");
    expect(fill(SITE_CONTENT.home.lines.ctaTemplate, { label: "perfumería" })).toBe("Explorar perfumería");
    expect(fill(SITE_CONTENT.collection.resultsTemplate, { count: 12 })).toBe("12 piezas");
    expect(fill(SITE_CONTENT.product.purchase.lowStockTemplate, { count: 2 })).toBe("Quedan 2");
    expect(fill(fillStoreName(SITE_CONTENT.footer.copyrightTemplate, SITE_CONTENT.brand.name), { year: 2026 })).toBe("© 2026 Tu tienda");
    expect(fill("sin claves {x}", {})).toBe("sin claves {x}");
  });

  it("cada plantilla de producto tiene sus textos y los enlaces de línea del footer existen", () => {
    for (const kind of LINE_TEMPLATES) {
      const copy = SITE_CONTENT.product.byKind[kind];
      expect(copy.pieceTab && copy.descriptionTitle && copy.variantLabel).toBeTruthy();
      expect(copy.galleryCaptions).toHaveLength(2);
    }
    const lineHrefs = SITE_CONTENT.footer.columns.flatMap((c) => c.links.map((l) => l.href)).filter((h) => h.startsWith("/coleccion/"));
    expect(lineHrefs.map((h) => h.split("/")[2])).toEqual(SEED_LINES.map((l) => l.slug));
  });

  it("el builder de WhatsApp usa las plantillas del contenido", () => {
    const b = new WaMeLinkBuilder("573001234567", {
      product: SITE_CONTENT.whatsapp.productMessageTemplate,
      generic: SITE_CONTENT.whatsapp.genericMessage,
      cart: SITE_CONTENT.cart.whatsappMessageTemplate,
    });
    const url = b.forCart({ names: ["A", "B"], totalFormatted: "$ 1 COP" })!;
    expect(decodeURIComponent(url.split("text=")[1]!)).toBe("Hola, quiero cerrar por WhatsApp mi bolsa: A, B. Total $ 1 COP.");
  });
});
