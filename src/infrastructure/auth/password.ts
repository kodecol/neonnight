import { createHash, timingSafeEqual } from "node:crypto";

/** Compara la contraseña con ADMIN_PASSWORD en tiempo constante (hash de longitud fija). */
export function checkAdminPassword(input: string, expected = process.env.ADMIN_PASSWORD ?? ""): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && (process.env.ADMIN_SECRET ?? "").length >= 32;
}
