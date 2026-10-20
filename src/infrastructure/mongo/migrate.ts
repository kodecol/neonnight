import type { Db } from "mongodb";
import type { ProductMedia, WatchSpecs } from "@/domain/entities/product";
import type { ProductDoc } from "./product-mapper";

/** Documento de reloj anterior al catálogo multilínea (colección `watches`). */
interface LegacyWatchDoc {
  _id: string;
  slug: string;
  brand: string;
  model: string;
  reference: string;
  priceCents: number;
  currency: "COP";
  category: string;
  condition: ProductDoc["condition"];
  subtitle: string;
  description: string[];
  specs: Omit<WatchSpecs, "kind">;
  media: ProductMedia;
  includes: string[];
  availability: ProductDoc["availability"];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Los relojes de la v1 pertenecen a la línea de relojería. */
const LEGACY_LINE = "relojeria";

/**
 * Lleva una base de la v1 (solo relojes) al modelo de productos:
 * `watches` → `products` con línea, ficha con `kind` y una variante única
 * (stock 1, o 0 si estaba vendido); las categorías sin línea pasan a
 * relojería. Idempotente: en una base ya migrada no hace nada.
 */
export async function migrateToProducts(db: Db): Promise<void> {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  if (names.has("watches") && !names.has("products")) await db.renameCollection("watches", "products");

  const products = db.collection("products");
  const legacy = await products.find<LegacyWatchDoc>({ variants: { $exists: false } }).toArray();
  for (const d of legacy) {
    const doc: ProductDoc = {
      _id: d._id,
      slug: d.slug,
      line: LEGACY_LINE,
      category: d.category,
      brand: d.brand,
      model: d.model,
      reference: d.reference,
      currency: d.currency,
      condition: d.condition,
      subtitle: d.subtitle,
      description: d.description,
      specs: { kind: "reloj", ...d.specs },
      variants: [{ id: "unica", label: "", priceCents: d.priceCents, stock: d.availability === "vendido" ? 0 : 1 }],
      minPriceCents: d.priceCents,
      media: d.media,
      includes: d.includes,
      availability: d.availability,
      featured: d.featured,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
    await products.replaceOne({ _id: d._id as never }, doc);
  }

  await db.collection("categories").updateMany({ line: { $exists: false } }, { $set: { line: LEGACY_LINE } });
}
