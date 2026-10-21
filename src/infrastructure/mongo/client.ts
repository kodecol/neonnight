import { MongoClient, type Db } from "mongodb";
import { runMigrations } from "./migrations";

/**
 * Conexión única por proceso, cacheada en globalThis para sobrevivir al HMR
 * de `next dev`. La primera conexión aplica las migraciones pendientes. El
 * catálogo NO se siembra solo: una instancia nueva arranca vacía y se siembra
 * con `lifecycle.mjs seed --niche …` (ver docs/MARCA-BLANCA.md).
 */
const g = globalThis as unknown as { __nnMongo?: Promise<Db> };

async function connect(uri: string, dbName: string): Promise<Db> {
  const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8_000 });
  await client.connect();
  const db = client.db(dbName);
  await runMigrations(db);
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

/** Nombre de la base: obligatorio con MONGODB_URI (una base por instancia, sin default de marca). */
export function mongoDbName(): string {
  const name = process.env.MONGODB_DB?.trim();
  if (!name) throw new Error("Falta MONGODB_DB: con MONGODB_URI hay que indicar la base de la instancia.");
  return name;
}
