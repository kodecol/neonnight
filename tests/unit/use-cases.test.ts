import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createContainer } from "@/infrastructure/container";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { InMemoryLineRepository } from "@/infrastructure/repositories/in-memory-line-repository";
import { InMemoryCategoryRepository } from "@/infrastructure/repositories/in-memory-category-repository";
import { InMemoryOrderRepository } from "@/infrastructure/repositories/in-memory-order-repository";
import { NoopAnalytics } from "@/infrastructure/analytics/console-analytics";
import { SEED_CATEGORIES, SEED_LINES, SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import { ListProducts } from "@/application/use-cases/list-products";
import { GetProductBySlug } from "@/application/use-cases/get-product-by-slug";
import { GetFeaturedProduct } from "@/application/use-cases/get-featured-product";
import { BrowseCatalog } from "@/application/use-cases/browse-catalog";
import { ListRelatedProducts } from "@/application/use-cases/list-related-products";
import { ResolveCart } from "@/application/use-cases/resolve-cart";
import { Checkout } from "@/application/use-cases/checkout";
import { ListBrands } from "@/application/use-cases/list-brands";
import { ListLines } from "@/application/use-cases/list-lines";
import { LineNotFoundError, ProductNotFoundError, ProductUnavailableError } from "@/domain/errors";
import type { Product } from "@/domain/entities/product";

const fixedClock = { now: () => new Date("2026-09-13T00:00:00Z") };
const seqIds = () => {
  let n = 0;
  return { next: () => `order-${++n}` };
};
const repo = (items: readonly Product[] = SEED_PRODUCTS) => new InMemoryProductRepository(items);
const catalog = (items: readonly Product[] = SEED_PRODUCTS) =>
  new BrowseCatalog({ products: repo(items), lines: new InMemoryLineRepository(SEED_LINES), categories: new InMemoryCategoryRepository(SEED_CATEGORIES) });
const withStock = (slug: string, stock: number) => SEED_PRODUCTS.map((p) => (p.slug.value === slug ? { ...p, variants: p.variants.map((v) => ({ ...v, stock })) } : p));

describe("Seed", () => {
  it("tiene tres líneas y cada producto pertenece a una línea y categoría coherentes", () => {
    expect(SEED_LINES.map((l) => [l.slug, l.template])).toEqual([
      ["relojeria", "reloj"],
      ["joyeria", "joya"],
      ["perfumeria", "perfume"],
    ]);
    const lineOf = new Map(SEED_LINES.map((l) => [l.slug, l.template]));
    const catLine = new Map(SEED_CATEGORIES.map((c) => [c.slug, c.line]));
    for (const p of SEED_PRODUCTS) {
      expect(lineOf.get(p.line), p.slug.value).toBe(p.specs.kind);
      expect(catLine.get(p.category), p.slug.value).toBe(p.line);
      expect(p.variants.length).toBeGreaterThan(0);
    }
    expect(new Set(SEED_PRODUCTS.map((p) => p.slug.value)).size).toBe(SEED_PRODUCTS.length);
  });

  it("toda foto o video del seed existe en public/", () => {
    const srcs = [
      ...SEED_LINES.flatMap((l) => (l.cover ? [l.cover.src] : [])),
      ...SEED_PRODUCTS.flatMap((p) => {
        const m = p.media;
        const hero = m.hero ? ("poster" in m.hero ? [m.hero.src, m.hero.poster] : [m.hero.src]) : [];
        return [m.front?.src, m.back?.src, m.band?.src, m.video?.src, m.video?.poster, ...hero, ...m.gallery.map((g) => g.src)].filter((s): s is string => Boolean(s));
      }),
    ];
    const missing = [...new Set(srcs)].filter((s) => !existsSync(join(process.cwd(), "public", s)));
    expect(missing).toEqual([]);
  });
});

describe("ListProducts", () => {
  const uc = new ListProducts(repo());

  it("devuelve el catálogo completo y por línea", async () => {
    expect(await uc.execute()).toHaveLength(SEED_PRODUCTS.length);
    const watches = await uc.execute({ line: "relojeria" });
    expect(watches).toHaveLength(12);
    expect(watches.every((w) => w.kind === "reloj")).toBe(true);
  });

  it("alterna líneas para una selección corta y limita", async () => {
    const mixed = await uc.execute({ mixLines: true, limit: 3 });
    expect(new Set(mixed.map((p) => p.line)).size).toBe(3);
    expect(await uc.execute({ limit: 6 })).toHaveLength(6);
  });
});

describe("GetProductBySlug", () => {
  const uc = new GetProductBySlug(repo());

  it("reloj: ficha formateada y variante única", async () => {
    const w = await uc.execute("rolex-sky-dweller-326938");
    expect(w.reference).toBe("326938");
    expect(w.specs).toContainEqual({ label: "Caja", value: "42 mm · oro amarillo" });
    expect(w.specs).toContainEqual({ label: "Reserva de marcha", value: "72 horas" });
    expect(w.hero?.kind).toBe("video");
    expect(w.variants).toHaveLength(1);
    expect(w.quickVariant).toMatchObject({ maxQuantity: 1 });
    expect(w.priceFrom).toBe(false);
    expect(w.price.formatted).toBe("$ 168.000.000 COP");
  });

  it("perfume: notas, presentaciones con precio propio y precio desde", async () => {
    const p = await uc.execute("creed-aventus");
    expect(p.kind).toBe("perfume");
    expect(p.saleMode).toBe("unidades");
    expect(p.notes?.top).toContain("Bergamota de Calabria");
    expect(p.variants.map((v) => v.label)).toEqual(["50 ml", "100 ml"]);
    expect(p.priceFrom).toBe(true);
    expect(p.price.units).toBe(1_520_000);
    expect(p.quickVariant).toBeNull();
    expect(p.conditionLabel).toBe("Nuevo, sellado");
    expect(p.specs.find((s) => s.label === "Presentaciones")?.value).toBe("50 ml · 100 ml");
  });

  it("lanza ProductNotFoundError si no existe o el slug es inválido", async () => {
    await expect(uc.execute("no-existe")).rejects.toBeInstanceOf(ProductNotFoundError);
    await expect(uc.execute("../etc")).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});

describe("Estado y stock", () => {
  it("una pieza sin stock se lee Vendido; un perfume, Agotado o Últimas unidades", async () => {
    const sold = await new GetProductBySlug(repo(withStock("rolex-cosmograph-daytona-126500ln", 0))).execute("rolex-cosmograph-daytona-126500ln");
    expect(sold.status).toEqual({ code: "vendido", label: "Vendido" });
    expect(sold.purchasable).toBe(false);

    const out = await new GetProductBySlug(repo(withStock("creed-aventus", 0))).execute("creed-aventus");
    expect(out.status.code).toBe("agotado");
    const low = await new GetProductBySlug(repo(withStock("creed-aventus", 1))).execute("creed-aventus");
    expect(low.status).toEqual({ code: "ultimas", label: "Últimas unidades" });
    expect(low.variants[0]?.maxQuantity).toBe(1);
  });
});

describe("GetFeaturedProduct", () => {
  it("devuelve el destacado", async () => {
    expect((await new GetFeaturedProduct(repo()).execute())?.slug).toBe("rolex-sky-dweller-326938");
  });
});

describe("BrowseCatalog", () => {
  it("toda la colección: facetas comunes y líneas con conteo", async () => {
    const r = await catalog().execute({ line: null, params: {} });
    expect(r.total).toBe(SEED_PRODUCTS.length);
    expect(r.facets.map((f) => f.key)).toEqual(["marca", "precio", "disponibilidad"]);
    expect(r.lines.map((l) => [l.slug, l.count])).toEqual([
      ["relojeria", 12],
      ["joyeria", 8],
      ["perfumeria", 10],
    ]);
    expect(r.categories).toEqual([]);
    expect(r.filtered).toBe(false);
  });

  it("línea de perfumería: facetas propias, filtro y conteos disyuntivos", async () => {
    const all = await catalog().execute({ line: "perfumeria", params: {} });
    expect(all.facets.map((f) => f.key)).toEqual(expect.arrayContaining(["genero", "concentracion"]));
    const r = await catalog().execute({ line: "perfumeria", params: { genero: "femenino" } });
    // Con un solo valor posible, la concentración deja de ser una faceta útil y se oculta.
    expect(r.facets.some((f) => f.key === "concentracion")).toBe(false);
    expect(r.products.map((p) => p.brand)).toEqual(["Chanel", "Chanel"]);
    // La faceta activa sigue contando sus otras opciones con el resto de filtros.
    const genero = r.facets.find((f) => f.key === "genero")!;
    expect(genero.options.find((o) => o.value === "femenino")).toMatchObject({ selected: true, count: 2 });
    expect(genero.options.find((o) => o.value === "unisex")!.count).toBeGreaterThan(0);
    expect(r.active).toEqual([{ key: "genero", value: "femenino", label: "Femenino" }]);
  });

  it("combina marca (multi), categoría y orden por precio", async () => {
    const r = await catalog().execute({ line: "relojeria", params: { marca: "rolex,omega", orden: "precio-asc" } });
    expect(r.products.every((p) => p.brand === "Rolex" || p.brand === "Omega")).toBe(true);
    const prices = r.products.map((p) => p.price.units);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const cronos = await catalog().execute({ line: "relojeria", params: { categoria: "cronografo" } });
    expect(cronos.products.map((p) => p.subtitle)).toEqual(["Cronógrafo · 40 mm", "Cronógrafo · 42 mm"]);
    expect(cronos.categories.find((c) => c.slug === "cronografo")?.selected).toBe(true);

    const big = await catalog().execute({ line: "relojeria", params: { caja: "42-mas" } });
    expect(big.products.length).toBeGreaterThan(0);
  });

  it("ignora parámetros desconocidos y categorías de otra línea", async () => {
    const r = await catalog().execute({ line: "perfumeria", params: { categoria: "gmt", caja: "42-mas", marca: "nadie", orden: "raro" } });
    expect(r.query).toEqual({});
    expect(r.sort).toBe("novedades");
    expect(r.products).toHaveLength(10);
  });

  it("lo que no se puede comprar va al final", async () => {
    const r = await catalog(withStock("creed-aventus", 0)).execute({ line: "perfumeria", params: {} });
    expect(r.products.at(-1)?.slug).toBe("creed-aventus");
    const only = await catalog(withStock("creed-aventus", 0)).execute({ line: "perfumeria", params: { disponibilidad: "disponible" } });
    expect(only.products.some((p) => p.slug === "creed-aventus")).toBe(false);
  });

  it("línea inexistente", async () => {
    await expect(catalog().execute({ line: "gafas", params: {} })).rejects.toBeInstanceOf(LineNotFoundError);
  });
});

describe("ListLines y ListRelatedProducts", () => {
  it("lista solo líneas con productos", async () => {
    const lines = new InMemoryLineRepository([...SEED_LINES, { slug: "gafas", label: "Gafas", description: "", order: 9, template: "general", cover: null }]);
    expect((await new ListLines({ lines, products: repo() }).execute()).map((l) => l.slug)).toEqual(["relojeria", "joyeria", "perfumeria"]);
  });

  it("relacionados: misma línea, sin el propio, misma categoría primero", async () => {
    const related = await new ListRelatedProducts(repo()).execute("le-labo-santal-33");
    expect(related).toHaveLength(4);
    expect(related.every((p) => p.line === "perfumeria" && p.slug !== "le-labo-santal-33")).toBe(true);
    expect(related.slice(0, 2).every((p) => p.category === "amaderados")).toBe(true);
  });
});

describe("ResolveCart", () => {
  const uc = new ResolveCart(repo());

  it("resuelve precios por variante, acepta bolsas antiguas y descarta basura", async () => {
    const cart = await uc.execute([
      { watchId: "w-01", quantity: 1 },
      { productId: "pf-01", variantId: "100-ml", quantity: 2 },
      { productId: "pf-01", quantity: 1 }, // varias presentaciones y ninguna elegida
      { productId: "no-existe", quantity: 1 },
      { garbage: true },
      { productId: "w-03", quantity: 99 },
    ]);
    expect(cart.count).toBe(3);
    expect(cart.lines.map((l) => l.variantLabel)).toEqual(["", "100 ml"]);
    expect(cart.total.cents).toBe((168_000_000 + 2 * 2_040_000) * 100);
  });
});

describe("Checkout", () => {
  const make = (products: readonly Product[] = SEED_PRODUCTS) => {
    const orders = new InMemoryOrderRepository();
    const c = createContainer({ products: repo(products), orders, analytics: new NoopAnalytics(), clock: fixedClock, ids: seqIds() });
    return { uc: new Checkout(c), orders };
  };

  it("recalcula el total en el servidor y marca priceChanged si el cliente mintió", async () => {
    const { uc, orders } = make();
    const res = await uc.execute({ lines: [{ productId: "w-01", quantity: 1 }], expectedTotalCents: 1 }, "http://x.test/gracias");
    expect(res.total.cents).toBe(168_000_000 * 100);
    expect(res.priceChanged).toBe(true);
    expect(res.redirectUrl).toBe("http://x.test/gracias?orden=order-1");
    expect(orders.all()[0]?.total.cents).toBe(168_000_000 * 100);
  });

  it("cobra la presentación elegida por cantidad y une líneas repetidas", async () => {
    const { uc, orders } = make();
    const res = await uc.execute(
      {
        lines: [
          { productId: "pf-01", variantId: "50-ml", quantity: 1 },
          { productId: "pf-01", variantId: "50-ml", quantity: 1 },
          { watchId: "w-03", quantity: 1 },
        ],
      },
      "http://x.test/gracias",
    );
    expect(res.total.cents).toBe((2 * 1_520_000 + 16_900_000) * 100);
    const order = orders.all()[0]!;
    expect(order.lines).toHaveLength(2);
    expect(order.lines[0]).toMatchObject({ variantId: "50-ml", variantLabel: "50 ml", quantity: 2 });
  });

  it("rechaza piezas vendidas, stock insuficiente y presentaciones sin elegir", async () => {
    const sold = SEED_PRODUCTS.map((p) => (p.id === "w-02" ? { ...p, availability: "vendido" as const } : p));
    await expect(make(sold).uc.execute({ lines: [{ productId: "w-02", quantity: 1 }] }, "http://x.test/gracias")).rejects.toBeInstanceOf(ProductUnavailableError);

    const err = await make()
      .uc.execute({ lines: [{ productId: "pf-01", variantId: "100-ml", quantity: 5 }] }, "http://x.test/gracias")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProductUnavailableError);
    expect((err as Error).message).toContain("solo tiene 3 unidades");

    await expect(make().uc.execute({ lines: [{ productId: "pf-01", quantity: 1 }] }, "http://x.test/gracias")).rejects.toBeInstanceOf(ProductUnavailableError);
    await expect(make().uc.execute({ lines: [{ productId: "w-01", quantity: 2 }] }, "http://x.test/gracias")).rejects.toBeInstanceOf(ProductUnavailableError);
  });

  it("rechaza ids desconocidos y entradas inválidas", async () => {
    const { uc } = make();
    await expect(uc.execute({ lines: [{ productId: "zzz", quantity: 1 }] }, "http://x.test/gracias")).rejects.toBeInstanceOf(ProductNotFoundError);
    await expect(uc.execute({ lines: [] }, "http://x.test/gracias")).rejects.toThrow();
    await expect(uc.execute({ lines: [{ productId: "w-01", quantity: 11 }] }, "http://x.test/gracias")).rejects.toThrow();
  });
});

describe("ListBrands", () => {
  it("devuelve marcas únicas del catálogo, de la más a la menos representada", async () => {
    const brands = await new ListBrands(repo()).execute();
    expect(brands.slice(0, 2)).toEqual(["Cartier", "Rolex"]);
    expect(brands).toContain("Maison Francis Kurkdjian");
    expect(await new ListBrands(repo([])).execute()).toEqual([]);
  });
});
