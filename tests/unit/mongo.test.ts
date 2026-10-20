import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoClient, type Db } from "mongodb";
import { seedOnce } from "@/infrastructure/mongo/seed-once";
import { MongoWatchRepository } from "@/infrastructure/mongo/mongo-watch-repository";
import { MongoCategoryRepository } from "@/infrastructure/mongo/mongo-category-repository";
import { MongoOrderRepository } from "@/infrastructure/mongo/mongo-order-repository";
import { MongoPaymentSettingsRepository } from "@/infrastructure/mongo/mongo-payment-settings-repository";
import { ListWatches } from "@/application/use-cases/list-watches";
import { SaveWatch } from "@/application/use-cases/admin/save-watch";
import { GetAdminWatch } from "@/application/use-cases/admin/get-admin-watch";
import { orderId } from "@/domain/entities/order";
import { watchId } from "@/domain/entities/watch";
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
    await seedOnce(db);
    await seedOnce(db); // idempotente
  });
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("siembra una sola vez y respeta el orden del seed", async () => {
    const list = await new ListWatches(new MongoWatchRepository(provider)).execute();
    expect(list).toHaveLength(8);
    expect(list[0]?.slug).toBe("rolex-sky-dweller-326938");
    expect((await new ListWatches(new MongoWatchRepository(provider)).execute({ category: "cronografo" })).length).toBe(2);
    expect((await new MongoCategoryRepository(provider).list()).map((c) => c.slug)).toEqual(["automatico", "cronografo", "gmt", "buceo"]);
  });

  it("guarda ediciones conservando el orden de alta", async () => {
    const watches = new MongoWatchRepository(provider);
    const categories = new MongoCategoryRepository(provider);
    const form = (await new GetAdminWatch(watches).execute("w-05"))!;
    await new SaveWatch({ watches, categories, clock: { now: () => new Date() }, ids: { next: () => "x" } }).execute({ ...form, priceUnits: 1 });
    const w = await watches.findById("w-05");
    expect(w?.price.units).toBe(1);
    expect((await watches.findAll()).map((x) => x.id as string).indexOf("w-05")).toBe(4);
  });

  it("órdenes y settings cifrados", async () => {
    const orders = new MongoOrderRepository(provider);
    await orders.save({
      id: orderId("nn-1"),
      lines: [{ watchId: watchId("w-01"), slug: "s", name: "n", unitPrice: Money.fromUnits(10), quantity: 1 }],
      total: Money.fromUnits(10),
      status: "pendiente",
      createdAt: new Date(),
      paymentReference: "LNK_9",
    });
    expect((await orders.findByPaymentReference("LNK_9"))?.total.units).toBe(10);

    const secret = "s".repeat(40);
    const settings = new MongoPaymentSettingsRepository(provider, () => secret);
    await settings.save({ enabled: true, mode: "produccion", identityKey: "pk", secretKey: "sk_live", updatedAt: new Date() });
    const raw = await db.collection("settings").findOne({ _id: "payments" as never });
    expect(JSON.stringify(raw)).not.toContain("sk_live");
    expect((await settings.get()).secretKey).toBe("sk_live");
  });
});
