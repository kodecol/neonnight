import { describe, expect, it } from "vitest";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";
import { fill } from "@/application/lib/template";
import { WaMeLinkBuilder } from "@/infrastructure/whatsapp/wa-me-link-builder";

describe("Contenido centralizado", () => {
  it("el repositorio estático devuelve el contenido", async () => {
    const c = await new StaticSiteContentRepository().get();
    expect(c.brand.name).toBe("Neon Night");
    expect(c.social.instagram.posts.length).toBeGreaterThanOrEqual(4);
    expect(c.home.trust.items).toHaveLength(3);
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
