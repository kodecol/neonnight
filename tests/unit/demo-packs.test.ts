import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { brandKey } from "@/domain/entities/brand";
import type { Product, ProductImage, ProductKind } from "@/domain/entities/product";
import { SALE_MODE } from "@/domain/entities/product-line";
import { isVideo } from "@/domain/services/media-library";
import { productStatus, totalStock } from "@/domain/services/availability";
import { DEMO_NICHES, demoPack, isDemoNiche, type DemoPack } from "@/infrastructure/cms/demo";
import { SEED_BRANDS } from "@/infrastructure/cms/seed";

/** Campos de la ficha técnica de cada plantilla (con la clave canónica que deduce `buildProduct`). */
const SPEC_KEYS: Record<ProductKind, string[]> = {
  reloj: ["kind", "movement", "powerReserveHours", "caseMm", "caseMaterial", "caseMaterialKey", "crystal", "waterResistanceM"],
  joya: ["kind", "metal", "metalKey", "stones", "caratTotal", "weightGrams", "dimensions", "certificate"],
  perfume: ["kind", "concentration", "gender", "perfumer", "year", "notes"],
  general: ["kind", "rows"],
};

/** Marcas reales que nunca deben aparecer en un demo: las del catálogo de la tienda y otras casas conocidas. */
const REAL_BRANDS = [
  ...SEED_BRANDS.map((b) => b.name),
  ...["Patek Philippe", "Breguet", "Hublot", "IWC", "Breitling", "TAG Heuer", "Longines", "Tissot", "Seiko", "Montblanc", "Panerai", "Jaeger-LeCoultre"],
  ...["Tiffany", "Bvlgari", "Pandora", "Swarovski", "Chopard", "Graff", "Hermès", "Louis Vuitton", "Gucci", "Prada"],
  ...["Guerlain", "Yves Saint Laurent", "Lancôme", "Givenchy", "Armani", "Hugo Boss", "Carolina Herrera", "Jo Malone"],
];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REAL_BRAND_RE = new RegExp(`(^|[^\\p{L}])(${REAL_BRANDS.map(escape).join("|")})(?=$|[^\\p{L}])`, "iu");

/** Ancho y alto de un WebP leyendo su cabecera (VP8, VP8L o VP8X), sin depender de sharp. */
function webpSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") throw new Error(`${file} no es WebP`);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  throw new Error(`${file}: chunk WebP desconocido ${chunk}`);
}

function imagesOf(pack: DemoPack): ProductImage[] {
  const out: ProductImage[] = [];
  for (const l of pack.lines) if (l.cover) out.push(l.cover);
  for (const p of pack.products) {
    const m = p.media;
    out.push(...m.library, ...m.gallery);
    for (const img of [m.front, m.back, m.band, isVideo(m.hero) ? null : m.hero]) if (img) out.push(img);
  }
  return out;
}

const textOf = (pack: DemoPack) => JSON.stringify(pack);
const isSoldOut = (p: Product) => totalStock(p) === 0;

describe("Catálogos de demo", () => {
  it("expone los cinco nichos y valida los nombres", () => {
    expect(DEMO_NICHES).toEqual(["relojeria", "joyeria", "perfumeria", "ecommerce", "vacio"]);
    expect(isDemoNiche("joyeria")).toBe(true);
    expect(isDemoNiche("neonnight")).toBe(false);
    // El filtro de marcas reales sí atrapa lo que debe (y no palabras que solo las contienen).
    expect(REAL_BRAND_RE.test("Un Rolex de acero")).toBe(true);
    expect(REAL_BRAND_RE.test("brazalete de tiffany & co.")).toBe(true);
    expect(REAL_BRAND_RE.test("El modelo anterior")).toBe(false);
  });

  it("vacio no trae nada", () => {
    expect(demoPack("vacio")).toEqual({ lines: [], categories: [], brands: [], products: [] });
  });

  it("tiene el tamaño pedido por nicho", () => {
    const sizes = Object.fromEntries(
      DEMO_NICHES.map((n) => {
        const p = demoPack(n);
        return [n, [p.lines.length, p.categories.length, p.brands.length, p.products.length]];
      }),
    );
    expect(sizes).toEqual({ relojeria: [1, 4, 4, 8], joyeria: [1, 4, 4, 8], perfumeria: [1, 3, 4, 8], ecommerce: [3, 8, 6, 12], vacio: [0, 0, 0, 0] });
    expect(demoPack("relojeria").lines.map((l) => l.template)).toEqual(["reloj"]);
    expect(demoPack("joyeria").lines.map((l) => l.template)).toEqual(["joya"]);
    expect(demoPack("perfumeria").lines.map((l) => l.template)).toEqual(["perfume"]);
    expect(demoPack("ecommerce").lines.map((l) => l.template)).toEqual(["reloj", "joya", "perfume"]);
    const eco = demoPack("ecommerce");
    for (const l of eco.lines) {
      expect(eco.products.filter((p) => p.line === l.slug)).toHaveLength(4);
      expect(eco.categories.filter((c) => c.line === l.slug).length).toBeGreaterThanOrEqual(2);
    }
    for (const p of demoPack("perfumeria").products) expect(p.variants.length).toBeGreaterThanOrEqual(2);
  });

  it("devuelve copias: modificar un pack no altera el siguiente", () => {
    demoPack("relojeria").products.pop();
    expect(demoPack("relojeria").products).toHaveLength(8);
  });

  for (const niche of DEMO_NICHES.filter((n) => n !== "vacio")) {
    describe(niche, () => {
      const pack = demoPack(niche);
      const lines = new Map(pack.lines.map((l) => [l.slug, l]));
      const categories = new Map(pack.categories.map((c) => [c.slug, c]));
      const brands = new Set(pack.brands.map((b) => brandKey(b.name)));

      it("cada producto apunta a una línea, categoría y marca del mismo pack", () => {
        for (const p of pack.products) {
          expect(lines.has(p.line), `${p.id}: línea ${p.line}`).toBe(true);
          expect(categories.get(p.category)?.line, `${p.id}: categoría ${p.category}`).toBe(p.line);
          expect(brands.has(brandKey(p.brand)), `${p.id}: marca ${p.brand}`).toBe(true);
        }
        for (const c of pack.categories) expect(lines.has(c.line), `categoría ${c.slug}`).toBe(true);
        for (const b of pack.brands) {
          expect(b.lines.length, `${b.name} sin productos`).toBeGreaterThan(0);
          for (const l of b.lines) expect(lines.has(l)).toBe(true);
        }
      });

      it("slugs e ids únicos, ids con prefijo demo-", () => {
        const unique = (xs: string[]) => new Set(xs).size === xs.length;
        expect(unique(pack.products.map((p) => p.slug.value))).toBe(true);
        expect(unique(pack.products.map((p) => p.id))).toBe(true);
        expect(unique(pack.lines.map((l) => l.slug))).toBe(true);
        expect(unique(pack.categories.map((c) => c.slug))).toBe(true);
        expect(unique(pack.brands.map((b) => b.slug))).toBe(true);
        for (const p of pack.products) {
          expect(p.id.startsWith("demo-"), p.id).toBe(true);
          expect(unique(p.variants.map((v) => v.id)), p.id).toBe(true);
        }
      });

      it("un solo destacado, al menos un agotado y precios en COP", () => {
        expect(pack.products.filter((p) => p.featured)).toHaveLength(1);
        expect(pack.products.filter(isSoldOut).length).toBe(1);
        for (const p of pack.products) {
          const status = productStatus(p, SALE_MODE[lines.get(p.line)!.template]);
          expect(isSoldOut(p) ? ["vendido", "agotado"] : ["disponible", "ultimas"]).toContain(status);
          for (const v of p.variants) {
            expect(v.price.currency).toBe("COP");
            expect(v.price.units, `${p.id} ${v.label}`).toBeGreaterThanOrEqual(100_000);
            expect(v.stock).toBeGreaterThanOrEqual(0);
          }
          expect(p.description.length).toBeGreaterThan(0);
        }
      });

      it("la ficha técnica corresponde a la plantilla de su línea y está completa", () => {
        for (const p of pack.products) {
          const template = lines.get(p.line)!.template;
          expect(p.specs.kind, p.id).toBe(template);
          expect(Object.keys(p.specs).sort(), p.id).toEqual([...SPEC_KEYS[template]].sort());
          if (p.specs.kind === "perfume") {
            const { notes } = p.specs;
            expect(notes.top.length * notes.heart.length * notes.base.length, p.id).toBeGreaterThan(0);
            expect(p.specs.perfumer, p.id).toBeTruthy();
          }
          if (p.specs.kind === "reloj") expect(p.specs.powerReserveHours && p.specs.waterResistanceM, p.id).toBeTruthy();
          if (p.specs.kind === "joya") expect(p.specs.metalKey, p.id).not.toBe("otro");
        }
      });

      it("todas las imágenes existen en public/, son del nicho y miden lo declarado", () => {
        const imgs = imagesOf(pack);
        expect(imgs.length).toBeGreaterThan(pack.products.length);
        for (const img of imgs) {
          expect(img.src.startsWith(`/assets/demo/${niche}/`), img.src).toBe(true);
          const file = join("public", img.src);
          expect(existsSync(file), img.src).toBe(true);
          expect(webpSize(file), img.src).toEqual({ width: img.width, height: img.height });
          expect(statSync(file).size, img.src).toBeLessThan(25 * 1024);
          expect(img.alt.trim(), img.src).not.toBe("");
        }
        // Y no sobra ninguna: lo que genera el script es exactamente lo que usa el pack.
        const used = new Set(imgs.map((i) => i.src));
        expect(readdirSync(join("public", "assets", "demo", niche)).map((f) => `/assets/demo/${niche}/${f}`).sort()).toEqual([...used].sort());
      });

      it("no menciona la tienda ni marcas reales", () => {
        const text = textOf(pack);
        expect(text.toLowerCase()).not.toMatch(/neon\s*-?\s*night|neonnight|neonightonline/);
        expect(text).not.toMatch(REAL_BRAND_RE);
      });
    });
  }

  it("ninguna parte de la app importa los demos todavía (los conecta el comando seed)", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (path !== join("src", "infrastructure", "cms", "demo")) walk(path);
        } else if (/\.(ts|tsx)$/.test(name) && /cms\/demo["/]/.test(readFileSync(path, "utf8"))) offenders.push(path);
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});
