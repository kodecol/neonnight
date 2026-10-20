import type { AnyBulkWriteOperation, Db, Document } from "mongodb";
import { SEED_VERSION, SEEDED_CATEGORIES, SEEDED_LINES, SEEDED_PRODUCTS } from "../cms/seed";
import { toProductDoc, type ProductDoc } from "./product-mapper";
import { toLineDoc, type LineDoc } from "./mongo-line-repository";
import type { CategoryDoc } from "./mongo-category-repository";

interface SeedMeta {
  _id: string;
  at: Date;
  /** Ausente en bases sembradas antes del versionado: equivale a la v1. */
  version?: number;
}

const insertOnly = <T extends Document & { _id: string }>(docs: T[]): AnyBulkWriteOperation<T>[] =>
  docs.map((doc) => ({ updateOne: { filter: { _id: doc._id } as never, update: { $setOnInsert: doc }, upsert: true } }));

/**
 * Siembra incremental. Solo inserta lo que apareció en versiones posteriores
 * a la ya aplicada, y con `$setOnInsert`: nunca pisa ni re-crea lo que el
 * panel editó o borró.
 */
export async function seedCatalog(db: Db): Promise<void> {
  const meta = db.collection<SeedMeta>("meta");
  const current = await meta.findOne({ _id: "seed" });
  const from = current ? (current.version ?? 1) : 0;
  if (from >= SEED_VERSION) return;

  const pick = <T>(rows: ReadonlyArray<{ since: number; item: T }>) => rows.filter((r) => r.since > from).map((r) => r.item);

  const lines = pick(SEEDED_LINES).map(toLineDoc);
  const categories = pick(SEEDED_CATEGORIES).map((c): CategoryDoc => ({ _id: c.slug, label: c.label, order: c.order, line: c.line }));
  const base = Date.now();
  // createdAt decreciente: el orden "más reciente primero" respeta el orden del seed.
  const products = pick(SEEDED_PRODUCTS).map((p, i) => toProductDoc(p, new Date(base - i * 60_000)));

  if (lines.length) await db.collection<LineDoc>("lines").bulkWrite(insertOnly(lines));
  if (categories.length) await db.collection<CategoryDoc>("categories").bulkWrite(insertOnly(categories));
  if (products.length) await db.collection<ProductDoc>("products").bulkWrite(insertOnly(products));
  await meta.updateOne({ _id: "seed" }, { $set: { version: SEED_VERSION }, $setOnInsert: { at: new Date() } }, { upsert: true });
}
