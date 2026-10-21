import type { Order } from "../entities/order";

const ACCENTS: Record<string, string> = { a: "[aáàä]", e: "[eéèë]", i: "[iíìï]", o: "[oóòö]", u: "[uúùü]", n: "[nñ]" };
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Patrones (fuente de RegExp, sin distinguir mayúsculas) de la búsqueda del
 * panel por id, nombre, correo o celular. Ignora tildes, y el celular se busca
 * por sus dígitos: da igual "310 987 6543" que "3109876543". Los usan el
 * repositorio en memoria y el de Mongo (`$regex`): ambos encuentran lo mismo.
 */
export function orderSearchPatterns(term: string): { text: string; phone: string | null } | null {
  const plain = term
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (!plain) return null;
  const text = [...plain].map((ch) => ACCENTS[ch] ?? escape(ch)).join("");
  const digits = plain.replace(/\D/g, "");
  const phone = digits.length >= 3 && /^[\d\s+()-]+$/.test(plain) ? digits.split("").join("[\\s()-]*") : null;
  return { text, phone };
}

export function matchesOrderSearch(o: Order, term: string): boolean {
  const p = orderSearchPatterns(term);
  if (!p) return true;
  const text = new RegExp(p.text, "i");
  if ([o.id, o.customer?.name, o.customer?.email, o.customer?.phone].some((v) => v && text.test(v))) return true;
  return p.phone !== null && Boolean(o.customer?.phone) && new RegExp(p.phone).test(o.customer!.phone);
}
