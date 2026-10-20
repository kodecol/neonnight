import { describe, expect, it } from "vitest";
import { createContainer } from "@/infrastructure/container";
import { InMemoryWatchRepository } from "@/infrastructure/repositories/in-memory-watch-repository";
import { InMemoryOrderRepository } from "@/infrastructure/repositories/in-memory-order-repository";
import { NoopAnalytics } from "@/infrastructure/analytics/console-analytics";
import { SEED_WATCHES } from "@/infrastructure/cms/seed";
import { ListWatches } from "@/application/use-cases/list-watches";
import { GetWatchBySlug } from "@/application/use-cases/get-watch-by-slug";
import { GetFeaturedWatch } from "@/application/use-cases/get-featured-watch";
import { ResolveCart } from "@/application/use-cases/resolve-cart";
import { Checkout } from "@/application/use-cases/checkout";
import { ListBrands } from "@/application/use-cases/list-brands";
import { WatchNotFoundError, WatchUnavailableError } from "@/domain/errors";

const fixedClock = { now: () => new Date("2026-09-13T00:00:00Z") };
const seqIds = () => {
  let n = 0;
  return { next: () => `order-${++n}` };
};

describe("ListWatches", () => {
  const uc = new ListWatches(new InMemoryWatchRepository(SEED_WATCHES));

  it("devuelve los 8 productos del prototipo", async () => {
    const all = await uc.execute();
    expect(all).toHaveLength(8);
    expect(all[0]?.name).toBe("Rolex Sky-Dweller");
    expect(all[0]?.price.formatted).toBe("$ 168.000.000 COP");
  });

  it("filtra por categoría", async () => {
    const cronos = await uc.execute({ category: "cronografo" });
    expect(cronos.map((w) => w.subtitle)).toEqual(["Cronógrafo · 40 mm", "Cronógrafo · 42 mm"]);
  });

  it("filtra por precio máximo (HASTA $35.000.000)", async () => {
    const cheap = await uc.execute({ maxPriceUnits: 35_000_000 });
    expect(cheap.every((w) => w.price.units <= 35_000_000)).toBe(true);
    expect(cheap).toHaveLength(4);
  });

  it("limita", async () => {
    expect(await uc.execute({ limit: 6 })).toHaveLength(6);
  });
});

describe("GetWatchBySlug", () => {
  const uc = new GetWatchBySlug(new InMemoryWatchRepository(SEED_WATCHES));

  it("devuelve el detalle con specs formateadas", async () => {
    const w = await uc.execute("rolex-sky-dweller-326938");
    expect(w.reference).toBe("326938");
    expect(w.specs.case).toBe("42 mm · oro amarillo");
    expect(w.specs.powerReserve).toBe("72 horas");
    expect(w.hero?.kind).toBe("video");
  });

  it("lanza WatchNotFoundError si no existe o el slug es inválido", async () => {
    await expect(uc.execute("no-existe")).rejects.toBeInstanceOf(WatchNotFoundError);
    await expect(uc.execute("../etc")).rejects.toBeInstanceOf(WatchNotFoundError);
  });
});

describe("GetFeaturedWatch", () => {
  it("devuelve la referencia 01", async () => {
    const w = await new GetFeaturedWatch(new InMemoryWatchRepository(SEED_WATCHES)).execute();
    expect(w?.slug).toBe("rolex-sky-dweller-326938");
  });
});

describe("ResolveCart", () => {
  const uc = new ResolveCart(new InMemoryWatchRepository(SEED_WATCHES));

  it("resuelve nombres y precios del servidor y descarta basura", async () => {
    const cart = await uc.execute([
      { watchId: "w-01", quantity: 1 },
      { watchId: "w-02", quantity: 1 },
      { watchId: "no-existe", quantity: 1 },
      { garbage: true },
      { watchId: "w-03", quantity: 99 },
    ]);
    expect(cart.count).toBe(2);
    expect(cart.total.cents).toBe((168_000_000 + 132_000_000) * 100);
    expect(cart.total.formatted).toBe("$ 300.000.000 COP");
  });
});

describe("Checkout", () => {
  const make = (watches = SEED_WATCHES) => {
    const orders = new InMemoryOrderRepository();
    const c = createContainer({
      watches: new InMemoryWatchRepository(watches),
      orders,
      analytics: new NoopAnalytics(),
      clock: fixedClock,
      ids: seqIds(),
    });
    return { uc: new Checkout(c), orders };
  };

  it("recalcula el total en el servidor y marca priceChanged si el cliente mintió", async () => {
    const { uc, orders } = make();
    const res = await uc.execute({ lines: [{ watchId: "w-01", quantity: 1 }], expectedTotalCents: 1 }, "http://x.test/gracias");
    expect(res.total.cents).toBe(168_000_000 * 100);
    expect(res.priceChanged).toBe(true);
    expect(res.redirectUrl).toBe("http://x.test/gracias?orden=order-1");
    expect(orders.all()[0]?.total.cents).toBe(168_000_000 * 100);
  });

  it("rechaza piezas vendidas", async () => {
    const sold = SEED_WATCHES.map((w) => (w.id === "w-02" ? { ...w, availability: "vendido" as const } : w));
    const { uc } = make(sold);
    await expect(uc.execute({ lines: [{ watchId: "w-02", quantity: 1 }] }, "http://x.test/gracias")).rejects.toBeInstanceOf(WatchUnavailableError);
  });

  it("rechaza ids desconocidos y entradas inválidas", async () => {
    const { uc } = make();
    await expect(uc.execute({ lines: [{ watchId: "zzz", quantity: 1 }] }, "http://x.test/gracias")).rejects.toBeInstanceOf(WatchNotFoundError);
    await expect(uc.execute({ lines: [] }, "http://x.test/gracias")).rejects.toThrow();
    await expect(uc.execute({ lines: [{ watchId: "w-01", quantity: 2 }] }, "http://x.test/gracias")).rejects.toThrow();
  });
});

describe("ListBrands", () => {
  it("devuelve marcas únicas del catálogo, de la más a la menos representada", async () => {
    expect(await new ListBrands(new InMemoryWatchRepository(SEED_WATCHES)).execute()).toEqual(["Rolex", "Omega", "Cartier", "Tudor"]);
    expect(await new ListBrands(new InMemoryWatchRepository([])).execute()).toEqual([]);
  });
});
