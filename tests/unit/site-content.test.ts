import { describe, expect, it } from "vitest";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { fill } from "@/application/lib/template";
import { WaMeLinkBuilder } from "@/infrastructure/whatsapp/wa-me-link-builder";

describe("Contenido centralizado", () => {
  it("el repositorio estático devuelve el contenido", async () => {
    const c = await new StaticSiteContentRepository().get();
    expect(c.brand.name).toBe("Neon Night");
    expect(c.social.networks.map((n) => n.id)).toEqual(["instagram", "facebook", "tiktok", "youtube"]);
    expect(c.social.networks.every((n) => n.href.startsWith("https://"))).toBe(true);
    expect(c.home.trust.items.map((i) => i.title)).toEqual(["Respaldo por defectos de fábrica", "Garantía de 12 meses", "Envíos en menos de 3 días"]);
    expect(c.home.payments.logos.map((l) => l.name)).toEqual(["Visa", "Mastercard", "American Express", "Bold", "PSE", "Nequi", "Bancolombia", "Daviplata"]);
    expect(Object.keys(c.home.brands.logos)).toEqual(expect.arrayContaining(["rolex", "omega", "cartier", "tudor"]));
    expect(c.home.testimonials.items.every((t) => t.rating >= 1 && t.rating <= 5 && t.quote.length > 20)).toBe(true);
    expect(c.footer.columns.flatMap((col) => col.links.map((l) => l.label))).not.toContain("Financiación");
  });

  it("todas las plantillas tienen sus claves", () => {
    expect(fill(SITE_CONTENT.home.catalog.ctaTemplate, { count: 8 })).toBe("Ver las 8 referencias");
    expect(fill(SITE_CONTENT.home.hero.kickerTemplate, { brand: "Rolex" })).toBe("Rolex · Nueva referencia");
    expect(fill(SITE_CONTENT.footer.copyrightTemplate, { year: 2026 })).toBe("© 2026 Neon Night");
    expect(fill("sin claves {x}", {})).toBe("sin claves {x}");
  });

  it("los filtros de colección solo usan categorías válidas", () => {
    const valid = new Set(["automatico", "cronografo", "gmt", "buceo"]);
    for (const f of SITE_CONTENT.collection.filters) {
      if (f.category) expect(valid.has(f.category)).toBe(true);
    }
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
