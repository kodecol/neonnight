// Crea la colección `brands` a partir de las marcas (`brand`) de los productos
// y les asigna los logos que trae el sitio (src/infrastructure/cms/seed/brand-logos.json).
//
// - Una marca por nombre normalizado (sin tildes, mayúsculas ni espacios de más),
//   con el nombre tal como aparece primero en los productos más recientes.
// - Orden inicial: la más representada primero (como el marquee de siempre).
// - Idempotente: una marca que ya existe (mismo slug o mismo nombre normalizado)
//   no se toca, así que no pisa lo editado en el panel.
// - Logos: con CLOUDINARY_URL se suben a neonnight/sitio/marcas (public_id fijo,
//   overwrite:false) y se comprueba que Cloudinary los entregue; si no hay
//   Cloudinary o la entrega falla, quedan con su ruta /assets/… (van en la imagen).
//
// Uso (desde la raíz del repo, variables en el entorno, nunca en la línea de comandos):
//   node scripts/migrate-brands.mjs --dry-run
//   node scripts/migrate-brands.mjs
// Variables: MONGODB_URI, MONGODB_DB (por defecto neonnight) y opcional CLOUDINARY_URL.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MongoClient } from "mongodb";

const DRY = process.argv.includes("--dry-run");
const FOLDER = "neonnight/sitio/marcas";

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI en el entorno.");
  process.exit(1);
}

/** Igual que `brandKey` (src/domain/entities/brand.ts). */
const brandKey = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

/** Igual que `Slug.fromText` (src/domain/value-objects/slug.ts). */
const slugOf = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const LOGOS = JSON.parse(await readFile(join("src", "infrastructure", "cms", "seed", "brand-logos.json"), "utf8"));

let cloudinary = null;
if (process.env.CLOUDINARY_URL && !DRY) {
  ({ v2: cloudinary } = await import("cloudinary"));
  cloudinary.config({ secure: true });
}

/** Sube el SVG y comprueba la entrega; si algo falla, se queda con la ruta local. */
async function logoSrc(local, slug) {
  if (!cloudinary) return local;
  try {
    const res = await cloudinary.uploader.upload(join("public", local), { public_id: `${FOLDER}/${slug}`, resource_type: "image", overwrite: false, unique_filename: false, use_filename: false });
    const check = await fetch(res.secure_url, { method: "GET" });
    const type = check.headers.get("content-type") ?? "";
    if (check.ok && type.includes("svg")) return res.secure_url;
    console.warn(`  ! ${slug}: Cloudinary respondió ${check.status} (${type}); se deja ${local}`);
  } catch (e) {
    console.warn(`  ! ${slug}: no se pudo subir (${e instanceof Error ? e.message : e}); se deja ${local}`);
  }
  return local;
}

const client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
try {
  const db = client.db(process.env.MONGODB_DB || "neonnight");
  const products = await db.collection("products").find({}, { projection: { brand: 1, line: 1 } }).sort({ createdAt: -1 }).toArray();
  const brands = db.collection("brands");
  const existing = await brands.find({}, { projection: { name: 1, order: 1 } }).toArray();
  const taken = new Set(existing.flatMap((b) => [b._id, brandKey(b.name)]));
  let order = Math.max(0, ...existing.map((b) => b.order ?? 0));

  const groups = new Map();
  for (const p of products) {
    const name = String(p.brand ?? "").trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = brandKey(name);
    const g = groups.get(key) ?? { name, lines: new Set(), count: 0 };
    g.lines.add(p.line);
    g.count++;
    groups.set(key, g);
  }
  const sorted = [...groups.entries()].sort(([, a], [, b]) => b.count - a.count || a.name.localeCompare(b.name, "es"));

  let created = 0;
  for (const [key, g] of sorted) {
    const slug = slugOf(g.name);
    if (!slug || taken.has(slug) || taken.has(key)) continue;
    const logo = LOGOS[key];
    const doc = {
      _id: slug,
      name: g.name,
      lines: [...g.lines].sort(),
      logo: logo ? { src: await logoSrc(logo.src, slug), ratio: logo.ratio, mode: "silhouette" } : null,
      color: logo?.color ?? null,
      visible: true,
      order: ++order,
      description: null,
    };
    console.log(`  + ${g.name} (${g.count} producto${g.count === 1 ? "" : "s"})${doc.logo ? ` · logo ${doc.logo.src.split("/").pop()}` : ""}`);
    if (!DRY) await brands.updateOne({ _id: slug }, { $setOnInsert: doc }, { upsert: true });
    taken.add(slug).add(key);
    created++;
  }
  console.log(`${DRY ? "Se crearían" : "Creadas"} ${created} marcas; ya existían ${existing.length}.`);
} finally {
  await client.close();
}
