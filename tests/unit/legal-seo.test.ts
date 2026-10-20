import { describe, expect, it } from "vitest";
import { INFO_PAGE_SLUGS, type InfoBlock, type InfoPage } from "@/application/dto/info-page.dto";
import { trackingIds } from "@/application/lib/tracking-ids";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository, formatWhatsapp } from "@/infrastructure/content/static-site-content-repository";
import { parseRichText } from "@/presentation/lib/rich-text";
import { CONSENT_MAX_AGE_MS, parseConsent } from "@/presentation/analytics/consent";
import { toGa, toMeta } from "@/presentation/analytics/events";
import { merchantReturnPolicy, shippingDetails, whatsappPhone } from "@/presentation/lib/structured-data";

const repo = new StaticSiteContentRepository(SITE_CONTENT, "573001234567");
const pages = async () => (await Promise.all(INFO_PAGE_SLUGS.map((s) => repo.page(s)))).filter((p): p is InfoPage => p !== null);

/** Todos los textos de un bloque (para buscar enlaces y cifras). */
function texts(b: InfoBlock): string[] {
  switch (b.type) {
    case "p":
    case "note":
      return [b.text];
    case "list":
      return b.items;
    case "steps":
      return b.items.flatMap((s) => [s.title, s.body]);
    case "table":
      return [...b.head, ...b.rows.flat()];
    case "facts":
      return b.items.flatMap((f) => [f.label, f.value]);
  }
}
const pageText = (p: InfoPage) => [p.title, p.lead, p.description, ...p.sections.flatMap((s) => [s.title, ...s.blocks.flatMap(texts)])].join("\n");

describe("Páginas institucionales y legales", () => {
  it("existen todas, con secciones de id único", async () => {
    const all = await pages();
    expect(all.map((p) => p.slug)).toEqual([...INFO_PAGE_SLUGS]);
    for (const p of all) {
      const ids = p.sections.map((s) => s.id);
      expect(new Set(ids).size, p.slug).toBe(ids.length);
      expect(ids.every((id) => /^[a-z0-9-]+$/.test(id)), p.slug).toBe(true);
      expect(p.description.length, p.slug).toBeGreaterThan(50);
    }
  });

  it("cada enlace interno apunta a una ruta y un ancla que existen; los externos son seguros", async () => {
    const all = await pages();
    const anchors = new Map(all.map((p) => [`/${p.slug}`, new Set(p.sections.map((s) => s.id))]));
    const routes = new Set(["/", "/coleccion", ...anchors.keys()]);
    const richTexts = [
      ...all.flatMap((p) => p.sections.flatMap((s) => s.blocks.flatMap(texts))),
      SITE_CONTENT.cart.legalNote,
      SITE_CONTENT.consent.body,
    ];
    for (const t of richTexts) {
      const flat = (ns: ReturnType<typeof parseRichText>): ReturnType<typeof parseRichText> => ns.flatMap((n) => (n.type === "strong" ? flat(n.children) : [n]));
      for (const n of flat(parseRichText(t))) {
        if (n.type !== "link") continue;
        if (n.href.startsWith("https://") || n.href.startsWith("mailto:")) continue;
        const [path, hash] = n.href.split("#");
        expect(routes.has(path!), n.href).toBe(true);
        if (hash) expect(anchors.get(path!)?.has(hash), n.href).toBe(true);
      }
    }
    const footerHrefs = [...SITE_CONTENT.footer.columns.flatMap((c) => c.links), ...SITE_CONTENT.footer.legalLinks].map((l) => l.href).filter((h) => h.startsWith("/") && !h.includes("#"));
    for (const h of footerHrefs) expect(routes.has(h) || h.startsWith("/coleccion/"), h).toBe(true);
  });

  it("los plazos coinciden en páginas, home y bolsa (fuente única: policies)", async () => {
    const { warrantyMonths, returnDays, shipping } = SITE_CONTENT.policies;
    const byslug = Object.fromEntries((await pages()).map((p) => [p.slug, pageText(p)]));
    expect(byslug.garantia).toContain(`${warrantyMonths} meses`);
    expect(byslug.devoluciones).toContain(`${returnDays} días`);
    expect(byslug.envios).toContain(shipping.carrier);
    const trust = SITE_CONTENT.home.trust.items.map((i) => `${i.title} ${i.body}`).join(" ");
    expect(trust).toContain(`${returnDays} días`);
    expect(trust).toContain(shipping.carrier);
    expect(SITE_CONTENT.brand.description).toContain(`${warrantyMonths} meses`);
    expect(SITE_CONTENT.cart.legalNote).toContain(`${returnDays} días`);
    expect(SITE_CONTENT.info.related.devoluciones.body).toContain(`${returnDays} días`);
    expect(SITE_CONTENT.info.related.garantia.body).toContain(`${warrantyMonths} meses`);
  });

  it("identifican al vendedor y no prometen lo que ya no existe", async () => {
    const all = (await pages()).map(pageText).join("\n");
    const site = JSON.stringify(SITE_CONTENT);
    expect(all).toContain(SITE_CONTENT.company.registry.number);
    expect(all).toContain("+57 300 123 4567");
    for (const text of [all, site]) {
      expect(text).not.toMatch(/contra verificación/i);
      expect(text).not.toMatch(/showroom/i);
    }
  });

  it("la política de privacidad lista las cookies que usa el sitio", async () => {
    const privacy = pageText((await repo.page("privacidad"))!);
    for (const name of ["neonnight.cart.v2", "neonnight.consent.v1", "_ga", "_fbp"]) expect(privacy).toContain(name);
  });
});

describe("Texto enriquecido", () => {
  it("convierte negrita y enlaces, y descarta destinos inseguros", () => {
    expect(parseRichText("Ver **12 meses** en [garantía](/garantia).")).toEqual([
      { type: "text", text: "Ver " },
      { type: "strong", children: [{ type: "text", text: "12 meses" }] },
      { type: "text", text: " en " },
      { type: "link", text: "garantía", href: "/garantia" },
      { type: "text", text: "." },
    ]);
    expect(parseRichText("**[Garantía](/garantia)** total")[0]).toEqual({ type: "strong", children: [{ type: "link", text: "Garantía", href: "/garantia" }] });
    expect(parseRichText("[x](javascript:alert(1))")[0]).toMatchObject({ type: "text" });
    expect(parseRichText("[x](//evil.example)")[0]).toMatchObject({ type: "text", text: "x" });
    expect(parseRichText("[x](http://inseguro.example)")[0]).toMatchObject({ type: "text", text: "x" });
  });
});

describe("Consentimiento y medición", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  it("solo acepta elecciones válidas y vigentes", () => {
    const ok = JSON.stringify({ analytics: true, marketing: false, at: "2026-10-01T00:00:00Z" });
    expect(parseConsent(ok, now)).toEqual({ analytics: true, marketing: false, at: "2026-10-01T00:00:00Z" });
    expect(parseConsent(null, now)).toBeNull();
    expect(parseConsent("{roto", now)).toBeNull();
    expect(parseConsent(JSON.stringify({ analytics: "sí", marketing: false, at: "2026-10-01T00:00:00Z" }), now)).toBeNull();
    expect(parseConsent(JSON.stringify({ analytics: true, marketing: true, at: new Date(now - CONSENT_MAX_AGE_MS - 1000).toISOString() }), now)).toBeNull();
  });

  it("los IDs de medición se validan antes de llegar a un <script>", () => {
    expect(trackingIds({ ga: " G-ABC123XYZ ", pixel: "123456789012345" })).toEqual({ gaId: "G-ABC123XYZ", pixelId: "123456789012345" });
    expect(trackingIds({ ga: "G-1');alert(1)//", pixel: "12345<script>" })).toEqual({ gaId: null, pixelId: null });
    expect(trackingIds({})).toEqual({ gaId: null, pixelId: null });
  });

  it("traduce la compra a GA4 y a Meta en pesos, con ID de deduplicación", () => {
    const purchase = { name: "purchase" as const, orderId: "ord-1", valueCents: 2_500_000_00, items: [{ id: "p1", name: "Reloj", priceCents: 2_500_000_00, quantity: 1 }] };
    expect(toGa(purchase)).toEqual([
      "purchase",
      { transaction_id: "ord-1", currency: "COP", value: 2_500_000, shipping: 0, items: [{ item_id: "p1", item_name: "Reloj", price: 2_500_000, quantity: 1 }] },
    ]);
    expect(toMeta(purchase)).toEqual([
      "Purchase",
      { content_ids: ["p1"], contents: [{ id: "p1", quantity: 1 }], content_type: "product", value: 2_500_000, currency: "COP" },
      "purchase-ord-1",
    ]);
    expect(toGa({ name: "contact", channel: "whatsapp", location: "/reloj/x" })[0]).toBe("generate_lead");
    expect(toMeta({ name: "view_item_list", listName: "x", items: [] })).toBeNull();
  });
});

describe("Datos estructurados y contacto", () => {
  it("devoluciones y envío salen de las políticas", () => {
    expect(merchantReturnPolicy(SITE_CONTENT)).toMatchObject({ merchantReturnDays: SITE_CONTENT.policies.returnDays, applicableCountry: "CO" });
    expect(shippingDetails(SITE_CONTENT)).toMatchObject({ shippingRate: { value: 0, currency: "COP" }, shippingDestination: { addressCountry: "CO" } });
  });

  it("formatea el WhatsApp para mostrarlo y como teléfono", () => {
    expect(formatWhatsapp("573001234567")).toBe("+57 300 123 4567");
    expect(formatWhatsapp("")).toBeNull();
    expect(whatsappPhone("https://wa.me/573001234567?text=hola")).toBe("+573001234567");
    expect(whatsappPhone(null)).toBeNull();
  });
});
