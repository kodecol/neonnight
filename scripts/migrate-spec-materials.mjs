// Guarda el material canónico de cada pieza para los filtros de la tienda:
// `specs.caseMaterialKey` en relojes y `specs.metalKey` en joyas, deducidos
// del texto de la ficha con las mismas reglas que src/domain/services/materials.ts.
// Solo completa lo que falta (o lo que no es una clave válida): lo elegido en
// el panel no se toca. Idempotente.
//
// Uso (variables en el entorno, nunca en la línea de comandos):
//   node scripts/migrate-spec-materials.mjs --dry-run
//   node scripts/migrate-spec-materials.mjs
// Variables: MONGODB_URI y MONGODB_DB (por defecto neonnight).
import { MongoClient } from "mongodb";

const DRY = process.argv.includes("--dry-run");

const CASE_KEYS = ["acero", "acero-y-oro", "oro-amarillo", "oro-blanco", "oro-rosa", "platino", "titanio", "ceramica", "bronce", "otro"];
const METAL_KEYS = ["oro-amarillo", "oro-blanco", "oro-rosa", "oros-combinados", "platino", "plata", "acero", "titanio", "otro"];

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const GOLD_TONES = [
  ["amarillo", "oro-amarillo"],
  ["blanco", "oro-blanco"],
  ["rosa", "oro-rosa"],
  ["everose", "oro-rosa"],
  ["sedna", "oro-rosa"],
  ["moonshine", "oro-amarillo"],
];

function inferCaseMaterial(text) {
  const m = norm(text);
  if (!m) return null;
  if (m.includes("rolesor") || (/(acero|steel)/.test(m) && m.includes("oro"))) return "acero-y-oro";
  if (m.includes("platino") || m.includes("platinum")) return "platino";
  if (m.includes("titanio") || m.includes("titanium")) return "titanio";
  if (m.includes("ceramica") || m.includes("ceramic")) return "ceramica";
  if (m.includes("bronce") || m.includes("bronze")) return "bronce";
  if (m.includes("oro") || m.includes("gold") || m.includes("everose") || m.includes("sedna")) {
    const tone = GOLD_TONES.find(([t]) => m.includes(t));
    return tone ? tone[1] : "oro-amarillo";
  }
  return "acero";
}

function inferJewelryMetal(text) {
  const m = norm(text);
  if (!m) return null;
  if (m.includes("platino") || m.includes("platinum")) return "platino";
  if (m.includes("plata") || m.includes("silver")) return "plata";
  const tones = ["amarillo", "blanco", "rosa"].filter((t) => m.includes(t));
  if (tones.length > 1) return "oros-combinados";
  if (tones[0]) return `oro-${tones[0]}`;
  if (m.includes("oro") || m.includes("gold")) return "oro-amarillo";
  if (m.includes("titanio")) return "titanio";
  if (m.includes("acero") || m.includes("steel")) return "acero";
  return "otro";
}

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI en el entorno.");
  process.exit(1);
}

const client = await MongoClient.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
try {
  const products = client.db(process.env.MONGODB_DB || "neonnight").collection("products");
  const docs = await products.find({ "specs.kind": { $in: ["reloj", "joya"] } }, { projection: { slug: 1, specs: 1 } }).toArray();
  let changed = 0;
  for (const d of docs) {
    const s = d.specs ?? {};
    let set = null;
    if (s.kind === "reloj" && !CASE_KEYS.includes(s.caseMaterialKey)) set = { "specs.caseMaterialKey": inferCaseMaterial(s.caseMaterial) ?? "acero" };
    if (s.kind === "joya" && !METAL_KEYS.includes(s.metalKey)) set = { "specs.metalKey": inferJewelryMetal(s.metal) ?? "otro" };
    if (!set) continue;
    changed++;
    console.log(`  ${d.slug}: "${s.kind === "reloj" ? s.caseMaterial : s.metal}" → ${Object.values(set)[0]}`);
    if (!DRY) await products.updateOne({ _id: d._id }, { $set: set });
  }
  console.log(`${DRY ? "Se actualizarían" : "Actualizadas"} ${changed} de ${docs.length} piezas (relojes y joyas).`);
} finally {
  await client.close();
}
