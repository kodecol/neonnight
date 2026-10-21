/**
 * Materiales canónicos para filtrar: el material de la caja de un reloj y el
 * metal de una joya se eligen de estas listas en el panel. El texto libre de
 * la ficha ("Oystersteel", "Oro rosa 18 k") sigue siendo lo que se muestra.
 * Las funciones `infer*` deducen la clave del texto: sirven de respaldo para
 * datos guardados antes de que existiera el campo y para la migración.
 */
export const CASE_MATERIALS = {
  acero: "Acero",
  "acero-y-oro": "Acero y oro",
  "oro-amarillo": "Oro amarillo",
  "oro-blanco": "Oro blanco",
  "oro-rosa": "Oro rosa",
  platino: "Platino",
  titanio: "Titanio",
  ceramica: "Cerámica",
  bronce: "Bronce",
  otro: "Otro",
} as const;
export type CaseMaterialKey = keyof typeof CASE_MATERIALS;
export const CASE_MATERIAL_KEYS = Object.keys(CASE_MATERIALS) as CaseMaterialKey[];

export const JEWELRY_METALS = {
  "oro-amarillo": "Oro amarillo",
  "oro-blanco": "Oro blanco",
  "oro-rosa": "Oro rosa",
  "oros-combinados": "Oros combinados",
  platino: "Platino",
  plata: "Plata",
  acero: "Acero",
  titanio: "Titanio",
  otro: "Otro",
} as const;
export type JewelryMetalKey = keyof typeof JEWELRY_METALS;
export const JEWELRY_METAL_KEYS = Object.keys(JEWELRY_METALS) as JewelryMetalKey[];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const GOLD_TONES = [
  ["amarillo", "oro-amarillo"],
  ["blanco", "oro-blanco"],
  ["rosa", "oro-rosa"],
  ["everose", "oro-rosa"],
  ["sedna", "oro-rosa"],
  ["moonshine", "oro-amarillo"],
] as const;

/** Material de la caja de un reloj a partir del texto de la ficha. Vacío → null. */
export function inferCaseMaterial(text: string): CaseMaterialKey | null {
  const m = norm(text).trim();
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
  // Oystersteel, 904L, 316L y similares son acero; lo que no se reconoce también (la mayoría lo es).
  return "acero";
}

/** Metal de una joya a partir del texto de la ficha. Vacío → null; desconocido → "otro". */
export function inferJewelryMetal(text: string): JewelryMetalKey | null {
  const m = norm(text).trim();
  if (!m) return null;
  if (m.includes("platino") || m.includes("platinum")) return "platino";
  if (m.includes("plata") || m.includes("silver")) return "plata";
  const tones = (["amarillo", "blanco", "rosa"] as const).filter((t) => m.includes(t));
  if (tones.length > 1) return "oros-combinados";
  if (tones[0]) return `oro-${tones[0]}`;
  if (m.includes("oro") || m.includes("gold")) return "oro-amarillo";
  if (m.includes("titanio")) return "titanio";
  if (m.includes("acero") || m.includes("steel")) return "acero";
  return "otro";
}
