import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoClient, type Db } from "mongodb";
import { seedCatalog } from "@/infrastructure/mongo/seed-catalog";
import { migrateToProducts } from "@/infrastructure/mongo/migrate";
import { MongoProductRepository } from "@/infrastructure/mongo/mongo-product-repository";
import { MongoCategoryRepository } from "@/infrastructure/mongo/mongo-category-repository";
import { MongoLineRepository } from "@/infrastructure/mongo/mongo-line-repository";
import { MongoOrderRepository } from "@/infrastructure/mongo/mongo-order-repository";
import { MongoPaymentSettingsRepository } from "@/infrastructure/mongo/mongo-payment-settings-repository";
import { SEED_PRODUCTS } from "@/infrastructure/cms/seed";
import { ListProducts } from "@/application/use-cases/list-products";
import { SaveProduct } from "@/application/use-cases/admin/save-product";
import { GetAdminProduct } from "@/application/use-cases/admin/get-admin-product";
import { orderId } from "@/domain/entities/order";
import { productId } from "@/domain/entities/product";
import { Money } from "@/domain/value-objects/money";

/**
 * Integración contra Mongo real. Solo corre con MONGODB_TEST_URI, p. ej.:
 *   MONGODB_TEST_URI=mongodb://localhost:27018 npm test
 */
const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("Repositorios Mongo", () => {
  let client: MongoClient;
  let db: Db;
  const provider = () => Promise.resolve(db);

  beforeAll(async () => {
    client = await MongoClient.connect(uri!);
    db = client.db(`neonnight_test_${Date.now()}`);
    await migrateToProducts(db);
    await seedCatalog(db);
    await seedCatalog(db); // idempotente
  });
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("siembra líneas, categorías y productos respetando el orden del seed", async () => {
    const list = await new ListProducts(new MongoProductRepository(provider)).execute();
    expect(list).toHaveLength(SEED_PRODUCTS.length);
    expect(list.map((p) => p.slug)).toEqual(SEED_PRODUCTS.map((p) => p.slug.value));
    expect((await new MongoLineRepository(provider).list()).map((l) => l.slug)).toEqual(["relojeria", "joyeria", "perfumeria"]);
    expect((await new MongoCategoryRepository(provider).list()).slice(0, 4).map((c) => [c.slug, c.line])).toEqual([
      ["automatico", "relojeria"],
      ["cronografo", "relojeria"],
      ["gmt", "relojeria"],
      ["buceo", "relojeria"],
    ]);
  });

  it("guarda ediciones conservando el orden de alta y descuenta stock de forma atómica", async () => {
    const products = new MongoProductRepository(provider);
    const deps = { products, categories: new MongoCategoryRepository(provider), lines: new MongoLineRepository(provider), clock: { now: () => new Date() }, ids: { next: () => "x" } };
    const form = (await new GetAdminProduct(products).execute("w-05"))!;
    await new SaveProduct(deps).execute({ ...form, variants: [{ ...form.variants[0]!, priceUnits: 1 }] });
    expect((await products.findById("w-05"))?.variants[0]?.price.units).toBe(1);
    const order = SEED_PRODUCTS.map((p) => p.id as string);
    expect((await products.findAll()).map((x) => x.id as string).indexOf("w-05")).toBe(order.indexOf("w-05"));

    expect(await products.decrementStock(productId("pf-01"), "100-ml", 2)).toBe(true);
    expect(await products.decrementStock(productId("pf-01"), "100-ml", 2)).toBe(false); // quedaba 1
    expect((await products.findById("pf-01"))?.variants.map((v) => v.stock)).toEqual([4, 0]);
  });

  it("órdenes y settings cifrados", async () => {
    const orders = new MongoOrderRepository(provider);
    await orders.save({
      id: orderId("nn-1"),
      lines: [{ productId: productId("w-01"), variantId: "unica", variantLabel: "", slug: "s", name: "n", unitPrice: Money.fromUnits(10), quantity: 1 }],
      total: Money.fromUnits(10),
      status: "pendiente",
      createdAt: new Date(),
      paymentReference: "LNK_9",
      shipping: Money.zero(),
      paymentMethod: "bold",
      customer: null,
      consent: null,
    });
    expect((await orders.findByPaymentReference("LNK_9"))?.total.units).toBe(10);

    const secret = "s".repeat(40);
    const settings = new MongoPaymentSettingsRepository(provider, () => secret);
    await settings.save({ enabled: true, mode: "produccion", identityKey: "pk", secretKey: "sk_live", manual: { enabled: false, instructions: "x".repeat(30) }, updatedAt: new Date() });
    const raw = await db.collection("settings").findOne({ _id: "payments" as never });
    expect(JSON.stringify(raw)).not.toContain("sk_live");
    expect((await settings.get()).secretKey).toBe("sk_live");
  });
});

describe.skipIf(!uri)("Migración desde la v1 (solo relojes)", () => {
  let client: MongoClient;
  let db: Db;
  const provider = () => Promise.resolve(db);

  beforeAll(async () => {
    client = await MongoClient.connect(uri!);
    db = client.db(`neonnight_legacy_${Date.now()}`);
    // Base de la v1: colección `watches`, categorías sin línea y marcador de seed sin versión.
    const legacy = SEED_PRODUCTS.filter((p) => p.id === "w-01" || p.id === "w-02").map((p, i) => ({
      _id: p.id as string,
      slug: p.slug.value,
      brand: p.brand,
      model: p.model,
      reference: p.reference.value,
      priceCents: p.variants[0]!.price.cents,
      currency: "COP",
      category: p.category,
      condition: p.condition,
      subtitle: p.subtitle,
      description: [...p.description],
      specs: { movement: "x", powerReserveHours: 70, caseMm: 40, caseMaterial: "acero", crystal: "Zafiro", waterResistanceM: 100 },
      media: p.media,
      includes: [...p.includes],
      availability: i === 1 ? "vendido" : "disponible",
      featured: false,
      createdAt: new Date(Date.now() - i * 1000),
      updatedAt: new Date(),
    }));
    await db.collection("watches").insertMany(legacy as never[]);
    await db.collection("categories").insertMany([{ _id: "gmt", label: "GMT", order: 3 }] as never[]);
    await db.collection("meta").insertOne({ _id: "seed", at: new Date() } as never);
    await migrateToProducts(db);
    await migrateToProducts(db); // idempotente
    await seedCatalog(db);
  });
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("convierte los relojes, conserva lo vendido y solo agrega lo nuevo del seed", async () => {
    const products = new MongoProductRepository(provider);
    const w01 = await products.findById("w-01");
    const w02 = await products.findById("w-02");
    expect(w01).toMatchObject({ line: "relojeria", specs: { kind: "reloj" } });
    expect(w01?.variants).toHaveLength(1);
    expect(w02?.variants[0]?.stock).toBe(0);
    // Las refs 03–08 de la v1 se "borraron" en esa base: no se re-crean.
    expect(await products.findById("w-03")).toBeNull();
    expect(await products.findById("pf-01")).not.toBeNull();
    expect((await db.listCollections({ name: "watches" }).toArray()).length).toBe(0);
    expect((await new MongoCategoryRepository(provider).list()).find((c) => c.slug === "gmt")?.line).toBe("relojeria");
  });
});
