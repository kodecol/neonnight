import type { Db } from "mongodb";
import { migrateToProducts } from "./migrate";

/**
 * Migraciones versionadas de la base. La versión aplicada vive en
 * `meta/{_id:"schema"}`; cada arranque (y `lifecycle.mjs migrate`) aplica las
 * pendientes en orden. Cada `up` es idempotente: una base que ya tenía los
 * cambios (p. ej. la de Neon Night, anterior a este registro) las pasa sin
 * tocar nada. Para agregar una: nueva entrada al final, nunca editar una vieja.
 */
export interface Migration {
  version: number;
  name: string;
  up(db: Db): Promise<void>;
}

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: "catálogo multilínea (watches → products)", up: migrateToProducts },
  {
    version: 2,
    name: "índices de productos y pedidos",
    up: async (db) => {
      await Promise.all([
        db.collection("products").createIndex({ slug: 1 }, { unique: true }),
        db.collection("products").createIndex({ createdAt: -1 }),
        db.collection("products").createIndex({ line: 1, category: 1 }),
        db.collection("orders").createIndex({ paymentReference: 1 }),
        db.collection("orders").createIndex({ deletedAt: 1, createdAt: -1 }),
      ]);
    },
  },
];

/** Versión de esquema que espera este código (la de la última migración). */
export const SCHEMA_VERSION = MIGRATIONS.at(-1)!.version;

interface SchemaMeta {
  _id: "schema";
  version: number;
  history: { version: number; name: string; at: Date }[];
}

export async function schemaVersionOf(db: Db): Promise<number> {
  return (await db.collection<SchemaMeta>("meta").findOne({ _id: "schema" }))?.version ?? 0;
}

/** Aplica las migraciones pendientes. Devuelve de qué versión a cuál pasó y cuáles corrió. */
export async function runMigrations(db: Db): Promise<{ from: number; to: number; applied: string[] }> {
  const meta = db.collection<SchemaMeta>("meta");
  const from = await schemaVersionOf(db);
  if (from > SCHEMA_VERSION) throw new Error(`La base está en el esquema ${from} y este código llega hasta el ${SCHEMA_VERSION}: actualiza la imagen.`);
  const applied: string[] = [];
  for (const m of MIGRATIONS.filter((x) => x.version > from)) {
    await m.up(db);
    await meta.updateOne({ _id: "schema" }, { $set: { version: m.version }, $push: { history: { version: m.version, name: m.name, at: new Date() } } }, { upsert: true });
    applied.push(`${m.version}: ${m.name}`);
  }
  return { from, to: Math.max(from, SCHEMA_VERSION), applied };
}
