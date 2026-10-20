// Sube a Cloudinary los medios del catálogo que la base todavía referencia como
// archivos del repo ("/assets/…": fotos, portadas de línea, videos y posters) y
// reescribe esas rutas por la URL de Cloudinary. Así producción no sirve medios
// desde la imagen Docker (ver .dockerignore y ADR 0005).
//
// Idempotente: cada archivo tiene un public_id fijo (neonnight/catalogo/<ruta>)
// y se sube con overwrite:false, así que repetirlo no duplica nada. Solo toca
// los campos de medios de `products` (media) y `lines` (cover).
//
// Uso (desde la raíz del repo, con las variables en el entorno, nunca en la línea de comandos):
//   node scripts/sync-catalog-media.mjs --dry-run   # muestra qué subiría y qué cambiaría
//   node scripts/sync-catalog-media.mjs             # sube y reescribe
// Variables: MONGODB_URI, MONGODB_DB (por defecto neonnight) y CLOUDINARY_URL.
import { access } from "node:fs/promises";
import { extname, join } from "node:path";
import { MongoClient } from "mongodb";
import { v2 as cloudinary } from "cloudinary";

const FOLDER = "neonnight/catalogo";
const DRY = process.argv.includes("--dry-run");
const VIDEO = new Set([".mp4", ".webm", ".mov"]);
const TARGETS = [
  { collection: "products", field: "media" },
  { collection: "lines", field: "cover" },
];

for (const name of ["MONGODB_URI", "CLOUDINARY_URL"]) {
  if (!process.env[name]) {
    console.error(`Falta ${name} en el entorno.`);
    process.exit(1);
  }
}
cloudinary.config({ secure: true });

/** Todas las rutas locales ("/assets/…") dentro de un valor anidado. */
function localPaths(value, out = new Set()) {
  if (typeof value === "string" && value.startsWith("/assets/")) out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => localPaths(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => localPaths(v, out));
  return out;
}

/** Copia del valor con las rutas reemplazadas según `urls`. */
function rewrite(value, urls) {
  if (typeof value === "string") return urls.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => rewrite(v, urls));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, urls)]));
  return value;
}

async function upload(path) {
  const file = join("public", path);
  await access(file);
  const ext = extname(path).toLowerCase();
  const publicId = `${FOLDER}/${path.slice("/assets/".length, -ext.length)}`;
  if (DRY) return `cloudinary:${publicId}${ext}`;
  const res = await cloudinary.uploader.upload(file, {
    public_id: publicId,
    resource_type: VIDEO.has(ext) ? "video" : "image",
    overwrite: false,
    unique_filename: false,
    use_filename: false,
  });
  return res.secure_url;
}

const client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
try {
  const db = client.db(process.env.MONGODB_DB || "neonnight");
  const docs = [];
  for (const t of TARGETS) {
    for (const doc of await db.collection(t.collection).find({}, { projection: { [t.field]: 1 } }).toArray()) {
      const paths = localPaths(doc[t.field]);
      if (paths.size) docs.push({ ...t, id: doc._id, value: doc[t.field], paths });
    }
  }
  const unique = [...new Set(docs.flatMap((d) => [...d.paths]))].sort();
  console.log(`${docs.length} documentos con ${unique.length} medios locales${DRY ? " (simulación)" : ""}.`);

  const urls = new Map();
  for (const [i, path] of unique.entries()) {
    urls.set(path, await upload(path));
    console.log(`  [${i + 1}/${unique.length}] ${path}`);
  }

  let updated = 0;
  for (const d of docs) {
    if (!DRY) await db.collection(d.collection).updateOne({ _id: d.id }, { $set: { [d.field]: rewrite(d.value, urls) } });
    updated++;
  }
  console.log(`${DRY ? "Se actualizarían" : "Actualizados"} ${updated} documentos.`);
} finally {
  await client.close();
}
