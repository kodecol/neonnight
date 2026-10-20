#!/usr/bin/env node
// Valida que un mensaje siga la convención gitmoji del proyecto (docs/GITHUB.md §3):
//   <gitmoji> [(ámbito)]: <resumen en imperativo>
//   ✨ (admin): agrega filtro por categoría
// Uso:
//   node scripts/check-commit-msg.mjs <archivo-con-el-mensaje>   # hook commit-msg
//   node scripts/check-commit-msg.mjs --text "<mensaje>"         # CI (título del PR)
import { readFileSync } from "node:fs";

/** Gitmojis aceptados (subconjunto de https://gitmoji.dev) y su significado. */
export const GITMOJIS = {
  "✨": "nueva funcionalidad",
  "🐛": "corrige un bug",
  "🚑️": "hotfix crítico",
  "🩹": "corrección menor, no crítica",
  "♻️": "refactor",
  "⚡️": "rendimiento",
  "💄": "UI y estilos",
  "🎨": "estructura o formato del código",
  "📝": "documentación",
  "✅": "tests",
  "🔧": "configuración",
  "🔨": "scripts de desarrollo",
  "👷": "CI/CD",
  "🚀": "despliegue",
  "🐳": "Docker",
  "⬆️": "sube dependencias",
  "⬇️": "baja dependencias",
  "➕": "agrega dependencia",
  "➖": "quita dependencia",
  "🔒️": "seguridad o privacidad",
  "🔐": "secretos",
  "🗃️": "base de datos",
  "🍱": "assets",
  "🔥": "elimina código o archivos",
  "🚚": "mueve o renombra",
  "🏷️": "tipos",
  "♿️": "accesibilidad",
  "🌐": "idioma o localización",
  "🔍️": "SEO",
  "💥": "cambio incompatible",
  "🔖": "release o versión",
  "⏪️": "revierte cambios",
  "🔀": "merge de ramas",
  "🙈": ".gitignore",
  "🚨": "warnings de lint o compilador",
  "💬": "textos y copys",
  "🧱": "infraestructura",
  "🦺": "validación",
};

// Comparación tolerante con el selector de variación U+FE0F (algunos teclados lo omiten).
const strip = (s) => s.replace(/️/g, "");
const EMOJIS = Object.keys(GITMOJIS).map(strip).sort((a, b) => b.length - a.length);
const AUTO = /^(Merge |Revert "|fixup! |squash! |amend! )/;

export function validate(raw) {
  const first = raw.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() ?? "";
  if (AUTO.test(first)) return { ok: true };
  const line = strip(first);
  const emoji = EMOJIS.find((e) => line.startsWith(e));
  if (!emoji) return { ok: false, reason: "debe empezar con un gitmoji del proyecto" };
  const rest = line.slice(emoji.length);
  const m = /^ (\([a-z0-9][a-z0-9-]*\): )?(?!\()(\S.{2,})$/.exec(rest);
  if (!m) return { ok: false, reason: 'formato: "<gitmoji> [(ámbito)]: <resumen>", con un espacio tras el emoji y un ámbito en minúsculas' };
  if (first.length > 100) return { ok: false, reason: `la primera línea tiene ${first.length} caracteres (máximo 100)` };
  if (/\.$/.test(m[2])) return { ok: false, reason: "el resumen no termina en punto" };
  return { ok: true };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [flag, value] = process.argv.slice(2);
  const msg = flag === "--text" ? (value ?? "") : readFileSync(flag, "utf8");
  const res = validate(msg);
  if (!res.ok) {
    console.error(`✗ Mensaje inválido: ${res.reason}.`);
    console.error(`  Recibido: ${msg.split("\n")[0]}`);
    console.error('  Ejemplo:  ✨ (admin): agrega filtro por categoría');
    console.error("  Gitmojis: docs/GITHUB.md §3");
    process.exit(1);
  }
}
