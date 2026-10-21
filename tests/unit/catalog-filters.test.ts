import { describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { InMemoryLineRepository } from "@/infrastructure/repositories/in-memory-line-repository";
import { InMemoryCategoryRepository } from "@/infrastructure/repositories/in-memory-category-repository";
import { SEED_CATEGORIES, SEED_LINES, SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import { BrowseCatalog } from "@/application/use-cases/browse-catalog";
import { encodeRange, niceRound, parseRange, priceTramos, quantileCuts, rangeFromInputs } from "@/application/lib/ranges";
import { inferCaseMaterial, inferJewelryMetal } from "@/domain/services/materials";
import { startingPrice } from "@/domain/services/pricing";
import { Money } from "@/domain/value-objects/money";
import type { Product } from "@/domain/entities/product";

const catalog = (items: readonly Product[] = SEED_PRODUCTS, brands?: Array<{ name: string; order: number }>) =>
  new BrowseCatalog({
    products: new InMemoryProductRepository(items),
    lines: new InMemoryLineRepository(SEED_LINES),
    categories: new InMemoryCategoryRepository(SEED_CATEGORIES),
    ...(brands ? { brands: { list: async () => brands } } : {}),
  });

const watches = SEED_PRODUCTS.filter((p) => p.line === "relojeria");
const withPrice = (p: Product, units: number): Product => ({ ...p, variants: p.variants.map((v) => ({ ...v, price: Money.fromUnits(units) })) });
const sold = (p: Product): Product => ({ ...p, availability: "vendido" });

describe("Tramos de precio dinámicos", () => {
  it("redondea a cifras bonitas del mismo orden", () => {
    expect(niceRound(37_412_000)).toBe(40_000_000);
    expect(niceRound(1_380_000)).toBe(1_500_000);
    expect(niceRound(83_000)).toBe(80_000);
  });

  it("0, 1 o precios iguales: sin tramos", () => {
    expect(priceTramos([])).toEqual([]);
    expect(priceTramos([5_000_000])).toEqual([]);
    expect(priceTramos([5_000_000, 5_000_000, 5_000_000])).toEqual([]);
  });

  it("N precios: tramos sin huecos ni solapes, todos con al menos un precio", () => {
    const prices = watches.map((p) => startingPrice(p).units);
    const tramos = priceTramos(prices);
    expect(tramos.length).toBeGreaterThanOrEqual(2);
    expect(tramos[0]!.range.min).toBeNull();
    expect(tramos.at(-1)!.range.max).toBeNull();
    for (let i = 1; i < tramos.length; i++) expect(tramos[i]!.range.min).toBe(tramos[i - 1]!.range.max! + 1);
    for (const t of tramos) expect(prices.some((v) => (t.range.min === null || v >= t.range.min) && (t.range.max === null || v <= t.range.max))).toBe(true);
    // Cada precio cae en exactamente un tramo.
    for (const v of prices) expect(tramos.filter((t) => (t.range.min === null || v >= t.range.min) && (t.range.max === null || v <= t.range.max))).toHaveLength(1);
  });

  it("dos grupos muy separados no dejan tramos vacíos", () => {
    const cuts = quantileCuts([1, 1, 1, 1, 1000, 1000], (x) => Math.round(x));
    expect(cuts).toHaveLength(1);
    expect(cuts[0]).toBeGreaterThanOrEqual(1);
    expect(cuts[0]).toBeLessThan(1000);
  });

  it("lee y escribe el rango de la URL, también los tramos de antes", () => {
    expect(parseRange("hasta-20000000")).toEqual({ min: null, max: 20_000_000 });
    expect(parseRange("desde-150000000")).toEqual({ min: 150_000_000, max: null });
    expect(parseRange("20000000-60000000")).toEqual({ min: 20_000_000, max: 60_000_000 });
    expect(parseRange("60000000-20000000")).toEqual({ min: 20_000_000, max: 60_000_000 });
    expect(parseRange("raro")).toBeNull();
    expect(rangeFromInputs("20.000.000", "$ 60 000 000")).toEqual({ min: 20_000_000, max: 60_000_000 });
    expect(rangeFromInputs("", "")).toBeNull();
    expect(encodeRange({ min: null, max: 5 })).toBe("hasta-5");
    expect(encodeRange({ min: 5, max: null })).toBe("desde-5");
  });
});

describe("Catálogo con filtros dinámicos", () => {
  it("el rango de precio sale de la vista y se ajusta al crear o vender piezas", async () => {
    const base = await catalog(watches).execute({ line: "relojeria", params: {} });
    const max = Math.max(...watches.map((p) => startingPrice(p).units));
    expect(base.price?.max).toBe(max);

    // Una pieza nueva más cara entra en el rango.
    const expensive = { ...withPrice(watches[0]!, max * 3), id: "nuevo" as Product["id"], slug: watches[0]!.slug };
    const grown = await catalog([...watches, expensive]).execute({ line: "relojeria", params: {} });
    expect(grown.price?.max).toBe(max * 3);

    // Las vendidas siguen en la vista (al final), así que su precio cuenta salvo que se filtre por disponibles.
    const onlyAvailable = await catalog(watches.map((p, i) => (i === 0 ? sold(withPrice(p, max * 5)) : p))).execute({ line: "relojeria", params: { disponibilidad: "disponible" } });
    expect(onlyAvailable.price?.max).toBe(max);
  });

  it("filtra por rango libre y por tramo; el filtro activo se lee bien", async () => {
    const r = await catalog().execute({ line: "relojeria", params: { precio_min: "20.000.000", precio_max: "60.000.000" } });
    expect(r.query.precio).toEqual(["20000000-60000000"]);
    expect(r.products.every((p) => p.price.units >= 20_000_000 && p.price.units <= 60_000_000)).toBe(true);
    expect(r.active).toContainEqual({ key: "precio", value: "20000000-60000000", label: "De 20 millones a 60 millones" });
    expect(r.price?.selected).toEqual({ min: 20_000_000, max: 60_000_000 });

    const first = (await catalog().execute({ line: "relojeria", params: {} })).price!.options[0]!;
    const tramo = await catalog().execute({ line: "relojeria", params: { precio: first.value } });
    expect(tramo.products).toHaveLength(first.count);
    expect(tramo.price?.options.find((o) => o.value === first.value)?.selected).toBe(true);
  });

  it("una sola pieza o precios iguales: no hay filtro de precio", async () => {
    expect((await catalog(watches.slice(0, 1)).execute({ line: "relojeria", params: {} })).price).toBeNull();
    const same = watches.slice(0, 3).map((p) => withPrice(p, 10_000_000));
    expect((await catalog(same).execute({ line: "relojeria", params: {} })).price).toBeNull();
    expect((await catalog([]).execute({ line: null, params: {} })).price).toBeNull();
  });

  it("las facetas salen de los productos: sin opciones vacías ni facetas de una sola opción", async () => {
    const r = await catalog().execute({ line: "relojeria", params: {} });
    for (const f of r.facets) {
      expect(f.options.every((o) => o.count > 0)).toBe(true);
      if (f.key !== "disponibilidad") expect(f.options.length).toBeGreaterThan(1);
    }
    const caja = r.facets.find((f) => f.key === "caja")!;
    // Tamaños reales de las piezas, no cortes fijos.
    const sizes = [...new Set(watches.map((p) => (p.specs.kind === "reloj" ? p.specs.caseMm : 0)))];
    expect(caja.options).toHaveLength(sizes.length);
    expect(caja.options.map((o) => o.label)).toContain("40 mm");

    const perfumes = await catalog().execute({ line: "perfumeria", params: {} });
    expect(perfumes.facets.find((f) => f.key === "ml")?.options.map((o) => o.label)).toEqual(expect.arrayContaining(["50 ml", "100 ml"]));
  });

  it("material y metal leen el campo estructurado; los datos viejos usan el texto", async () => {
    const r = await catalog().execute({ line: "relojeria", params: {} });
    expect(r.facets.find((f) => f.key === "material")!.options.map((o) => o.value)).toEqual(expect.arrayContaining(["acero", "acero-y-oro", "titanio"]));
    const legacy = watches.map((p) => (p.specs.kind === "reloj" ? { ...p, specs: { ...p.specs, caseMaterialKey: undefined } } : p));
    const r2 = await catalog(legacy).execute({ line: "relojeria", params: {} });
    expect(
      r2.facets
        .find((f) => f.key === "material")!
        .options.map((o) => o.value)
        .sort(),
    ).toEqual(
      r.facets
        .find((f) => f.key === "material")!
        .options.map((o) => o.value)
        .sort(),
    );

    const j = await catalog().execute({ line: "joyeria", params: { metal: "oro-rosa" } });
    expect(j.products.length).toBe(2);
  });

  it("las marcas siguen el orden del catálogo de marcas cuando existe", async () => {
    const r = await catalog(undefined, [
      { name: "Tudor", order: 0 },
      { name: "Rolex", order: 1 },
    ]).execute({ line: "relojeria", params: {} });
    expect(
      r.facets
        .find((f) => f.key === "marca")!
        .options.slice(0, 2)
        .map((o) => o.label),
    ).toEqual(["Tudor", "Rolex"]);
  });

  it("deduce el material canónico del texto de la ficha", () => {
    expect(inferCaseMaterial("Oystersteel")).toBe("acero");
    expect(inferCaseMaterial("Rolesor blanco")).toBe("acero-y-oro");
    expect(inferCaseMaterial("Oro Everose 18 k")).toBe("oro-rosa");
    expect(inferCaseMaterial("Titanio de alta intensidad")).toBe("titanio");
    expect(inferCaseMaterial("")).toBeNull();
    expect(inferJewelryMetal("Oro blanco, amarillo y rosa 18 k")).toBe("oros-combinados");
    expect(inferJewelryMetal("Platino")).toBe("platino");
    expect(inferJewelryMetal("Resina")).toBe("otro");
  });
});
