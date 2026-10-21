import { MongoClient, type Db } from "mongodb";
import { migrateToProducts } from "./migrate";
import { seedCatalog } from "./seed-catalog";

/**
 * Conexión única por proceso, cacheada en globalThis para sobrevivir al HMR
 * de `next dev`. La primera conexión migra una base de la v1 (solo relojes),
 * crea índices e inserta lo que falte del seed.
 */
const g = globalThis as unknown as { __nnMongo?: Promise<Db> };

async function connect(uri: string, dbName: string): Promise<Db> {
  const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8_000 });
  await client.connect();
  const db = client.db(dbName);
  await migrateToProducts(db);
  await Promise.all([
    db.collection("products").createIndex({ slug: 1 }, { unique: true }),
    db.collection("products").createIndex({ createdAt: -1 }),
    db.collection("products").createIndex({ line: 1, category: 1 }),
    db.collection("orders").createIndex({ paymentReference: 1 }),
    db.collection("orders").createIndex({ deletedAt: 1, createdAt: -1 }),
  ]);
  await seedCatalog(db);
  return db;
}

export function mongoDb(uri: string, dbName: string): () => Promise<Db> {
  return () => {
    g.__nnMongo ??= connect(uri, dbName).catch((e: unknown) => {
      g.__nnMongo = undefined; // reintenta en la próxima petición
      throw e;
    });
    return g.__nnMongo;
  };
}

export type DbProvider = () => Promise<Db>;
