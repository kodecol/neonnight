import { describe, expect, it } from "vitest";
import { INFO_PAGE_SLUGS } from "@/application/dto/info-page.dto";
import { checkLinks, fillTokens, nextVersion, parseSections, serializeSections, tokenValues, tokenize, unknownTokens, colombiaDate } from "@/application/lib/legal-markdown";
import { SITE_CONTENT } from "@/infrastructure/content/site-content";
import { StaticSiteContentRepository } from "@/infrastructure/content/static-site-content-repository";

const repo = new StaticSiteContentRepository(SITE_CONTENT, "573001234567");
const values = tokenValues(SITE_CONTENT.company, "+57 300 123 4567", SITE_CONTENT.policies.shipping);

describe("Markdown de las páginas legales", () => {
  it.each(INFO_PAGE_SLUGS)("ida y vuelta sin pérdidas: %s", async (slug) => {
    const page = (await repo.page(slug))!;
    const md = serializeSections(page.sections);
    const { sections, issues } = parseSections(md);
    expect(issues).toEqual([]);
    expect(sections).toEqual(page.sections);
    // Con fichas: el texto editable lleva {correo}… y al pintarse vuelve a ser el mismo.
    const withTokens = tokenize(md, values);
    expect(fillTokens(withTokens, values)).toBe(md);
    expect(unknownTokens(withTokens)).toEqual([]);
  });

  it("las fichas reemplazan los datos de la empresa", () => {
    const md = tokenize("Escríbenos a contacto@neonightonline.com o por WhatsApp +57 300 123 4567.", values);
    expect(md).toBe("Escríbenos a {correo} o por WhatsApp {whatsapp}.");
    expect(fillTokens(md, { ...values, correo: "hola@neonightonline.com" })).toBe("Escríbenos a hola@neonightonline.com o por WhatsApp +57 300 123 4567.");
    expect(unknownTokens("Hola {correo} y {nombre}")).toEqual(["nombre"]);
  });

  it("señala lo que no se puede convertir", () => {
    expect(parseSections("Texto suelto").issues[0]?.message).toMatch(/empezar con una sección/);
    expect(parseSections("## A\n\n::: pasos\nSin separador\n:::").issues[0]?.message).toMatch(/Título — texto/);
    expect(parseSections("## A\n\n::: datos\nUno: dos").issues[0]?.message).toMatch(/cerrar el bloque/);
    expect(parseSections("## A\n\n| a | b |\n| x | y |").issues[0]?.message).toMatch(/separadora/);
    expect(parseSections("## A {#x}\n\nUno\n\n## B {#x}\n\nDos").issues.map((i) => i.message)).toContain("Hay dos secciones con el ancla #x.");
    const ok = parseSections("## Qué cubre\n\nUn párrafo\nen dos líneas.\n\n- a\n- b\n\n> nota\n\n::: pasos\nUno — primero\n:::\n\n::: datos\nCorreo: x@y.co\n:::");
    expect(ok.issues).toEqual([]);
    expect(ok.sections[0]).toMatchObject({ id: "que-cubre", blocks: [{ type: "p", text: "Un párrafo en dos líneas." }, { type: "list", items: ["a", "b"] }, { type: "note" }, { type: "steps" }, { type: "facts" }] });
  });

  it("revisa los enlaces", () => {
    const { sections } = parseSections("## A {#a}\n\nVer [b](#a), [c](/garantia#que-cubre), [d](/nada), [e](javascript:x), [f](/garantia#no), [g](https://www.sic.gov.co)");
    const issues = checkLinks(sections, { self: "/terminos", routes: (p) => ["/garantia", "/terminos"].includes(p), anchors: (p) => (p === "/garantia" ? ["que-cubre"] : null) });
    expect(issues.map((i) => i.message)).toEqual([
      expect.stringContaining("/nada"),
      expect.stringContaining("javascript:x"),
      expect.stringContaining("#no"),
    ]);
  });

  it("versiones y fecha de vigencia", () => {
    expect(nextVersion("1.0", false)).toBe("1.1");
    expect(nextVersion("1.9", false)).toBe("1.10");
    expect(nextVersion("1.4", true)).toBe("2.0");
    expect(colombiaDate(new Date("2026-10-21T03:00:00Z"))).toBe("2026-10-20");
  });
});
