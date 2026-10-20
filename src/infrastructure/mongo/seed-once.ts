import type { Db } from "mongodb";
import { SEED_CATEGORIES, SEED_WATCHES } from "../cms/seed";
import { toWatchDoc, type WatchDoc } from "./watch-mapper";

/**
 * Inserta el catálogo inicial la primera vez que se conecta a una base vacía.
 * El marcador en `meta` evita re-sembrar aunque luego se borre todo desde el panel.
 */
export async function seedOnce(db: Db): Promise<void> {
  const res = await db
    .collection<{ _id: string; at: Date }>("meta")
    .updateOne({ _id: "seed" }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  if (res.upsertedCount !== 1) return;

  const base = Date.now();
  // createdAt decreciente: el orden "más reciente primero" respeta el orden del seed.
  const docs = SEED_WATCHES.map((w, i) => toWatchDoc(w, new Date(base - i * 60_000)));
  if (docs.length) await db.collection<WatchDoc>("watches").insertMany(docs);
  if (SEED_CATEGORIES.length) {
    await db.collection<{ _id: string; label: string; order: number }>("categories").insertMany(
      SEED_CATEGORIES.map((c) => ({ _id: c.slug, label: c.label, order: c.order })),
    );
  }
}
