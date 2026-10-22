import { MongoClient, type Db } from "mongodb";
import { runMigrations } from "./migrations";

/**
 * Un `MongoClient` por URI y proceso (pool compartido), cacheado en globalThis
 * para sobrevivir al HMR de `next dev`. Cada base se abre con `client.db(name)`
 * y aplica sus migraciones pendientes la primera vez que se usa: en modo
 * `single` es la base de la instancia; en el demo host, una por tenant sobre
 * el mismo pool. El catálogo NO se siembra solo: una instancia nueva arranca
 * vacía y se siembra con `lifecycle.mjs seed --niche …` (ver docs/MARCA-BLANCA.md).
 */
const g = globalThis as unknown as { __nnMongoClients?: Map<string, Promise<MongoClient>>; __nnMongoDbs?: Map<string, Promise<Db>> };
const clients = (g.__nnMongoClients ??= new Map());
const dbs = (g.__nnMongoDbs ??= new Map());

export function mongoClient(uri: string): Promise<MongoClient> {
  let client = clients.get(uri);
  if (!client) {
    client = MongoClient.connect(uri, { maxPoolSize: 20, serverSelectionTimeoutMS: 8_000 }).catch((e: unknown) => {
      clients.delete(uri); // reintenta en la próxima petición
      throw e;
    });
    clients.set(uri, client);
  }
  return client;
}

export function mongoDb(uri: string, dbName: string): () => Promise<Db> {
  const key = `${uri}\u0000${dbName}`;
  return () => {
    let db = dbs.get(key);
    if (!db) {
      db = mongoClient(uri)
        .then(async (c) => {
          const d = c.db(dbName);
          await runMigrations(d);
          return d;
        })
        .catch((e: unknown) => {
          dbs.delete(key);
          throw e;
        });
      dbs.set(key, db);
    }
    return db;
  };
}

/** Olvida una base abierta (el demo host la llama al borrar un tenant). */
export function forgetMongoDb(uri: string, dbName: string): void {
  dbs.delete(`${uri}\u0000${dbName}`);
}

export type DbProvider = () => Promise<Db>;

/** Nombre de la base: obligatorio con MONGODB_URI (una base por instancia, sin default de marca). */
export function mongoDbName(): string {
  const name = process.env.MONGODB_DB?.trim();
  if (!name) throw new Error("Falta MONGODB_DB: con MONGODB_URI hay que indicar la base de la instancia.");
  return name;
}
