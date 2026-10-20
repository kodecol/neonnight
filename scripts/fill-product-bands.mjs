// Deja a cada pieza con su imagen final (la banda al cierre de la ficha) y su
// biblioteca de medios completa. Reglas, en orden:
//   1. Una banda propia (foto de ambiente) se conserva.
//   2. Si la banda repite la portada o es la foto del hero de otro modelo
//      (`--quitar <src>`), se descarta.
//   3. Sin banda válida: se usa la foto de ambiente del hero, si es imagen.
//   4. Si no hay: la foto `public/assets/products/<slug>-editorial.webp` del repo
//      (luego `sync-catalog-media.mjs` la sube a Cloudinary y reescribe la ruta).
// También guarda `media.library` (todas las fotos sin repetir) para el panel.
//
// Idempotente. Uso (variables en el entorno, nunca en la línea de comandos):
//   node scripts/fill-product-bands.mjs --dry-run [--quitar hero-day-date-poster]
//   node scripts/fill-product-bands.mjs [--quitar …]
// Variables: MONGODB_URI y MONGODB_DB (por defecto neonnight).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MongoClient } from "mongodb";

const DRY = process.argv.includes("--dry-run");
// `--quitar <texto>`: descarta la banda cuyo `src` contenga ese texto (sirve igual para /assets/… y Cloudinary).
const DROP = process.argv.flatMap((a, i, all) => (all[i - 1] === "--quitar" ? [a] : []));
const dropped = (src) => DROP.some((t) => src.includes(t));

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI en el entorno.");
  process.exit(1);
}

const isVideo = (m) => !!m && typeof m === "object" && "poster" in m;
const name = (d) => `${d.brand} ${d.model}`.trim();

/** Ancho y alto de un WebP (VP8, VP8L o VP8X) sin dependencias. */
function webpSize(b) {
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") throw new Error("No es WebP");
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`WebP desconocido (${chunk})`);
}

async function repoEditorial(slug, alt) {
  const src = `/assets/products/${slug}-editorial.webp`;
  try {
    return { src, alt, ...webpSize(await readFile(join("public", src))) };
  } catch {
    return null;
  }
}

function library(media) {
  const seen = new Map();
  const add = (img) => img && !isVideo(img) && !seen.has(img.src) && seen.set(img.src, img);
  (media.library ?? []).forEach(add);
  [media.front, media.back, media.hero, media.band].forEach(add);
  (media.gallery ?? []).forEach(add);
  return [...seen.values()];
}

const client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
try {
  const products = client.db(process.env.MONGODB_DB || "neonnight").collection("products");
  const docs = await products.find({}, { projection: { slug: 1, brand: 1, model: 1, media: 1 } }).toArray();
  const missing = [];
  let changed = 0;
  for (const d of docs) {
    const m = d.media ?? {};
    const valid = m.band && m.band.src !== m.front?.src && !dropped(m.band.src) ? m.band : null;
    const band = valid ?? (m.hero && !isVideo(m.hero) ? { ...m.hero, alt: `${name(d)} en ambiente` } : await repoEditorial(d.slug, `${name(d)} en ambiente`));
    if (!band) missing.push(d.slug);
    const next = { ...m, band: band ?? null };
    next.library = library(next);
    const same = JSON.stringify({ b: m.band ?? null, l: m.library ?? null }) === JSON.stringify({ b: next.band, l: next.library });
    if (same) continue;
    changed++;
    const from = m.band ? (m.band.src === m.front?.src ? "portada repetida" : dropped(m.band.src) ? "foto de otro modelo" : "propia") : "sin banda";
    console.log(`  ${d.slug}: ${from} → ${band ? band.src.split("/").pop() : "SIN FOTO"}`);
    if (!DRY) await products.updateOne({ _id: d._id }, { $set: { "media.band": next.band, "media.library": next.library } });
  }
  console.log(`${DRY ? "Se actualizarían" : "Actualizadas"} ${changed} de ${docs.length} piezas.`);
  if (missing.length) console.log(`Sin imagen final (falta foto de ambiente): ${missing.join(", ")}`);
} finally {
  await client.close();
}
