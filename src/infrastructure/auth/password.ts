import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { PasswordHasher } from "@/application/ports/admin-credentials";

/** Compara la contraseña con ADMIN_PASSWORD en tiempo constante (hash de longitud fija). */
export function checkAdminPassword(input: string, expected = process.env.ADMIN_PASSWORD ?? ""): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * El panel funciona si hay ADMIN_SECRET (firma la sesión y cifra secretos) y una
 * contraseña: la de la base o, mientras no exista, la de ADMIN_PASSWORD.
 */
export function isAdminConfigured(hasStoredPassword = false): boolean {
  return (hasStoredPassword || Boolean(process.env.ADMIN_PASSWORD)) && (process.env.ADMIN_SECRET ?? "").length >= 32;
}

// scrypt: N=2^15, r=8, p=1 (≈32 MB y ~50 ms por intento: caro para fuerza bruta, barato para un login).
const N = 32_768;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scrypt(plain: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  const opts: ScryptOptions = { N: n, r, p, maxmem: 128 * n * r * 2 };
  return new Promise((ok, ko) => scryptCb(plain.normalize("NFKC"), salt, KEYLEN, opts, (e, key) => (e ? ko(e) : ok(key))));
}

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scrypt(plain, salt, N, R, P);
    return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const [alg, n, r, p, salt, hash] = stored.split("$");
    if (alg !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
    const expected = Buffer.from(hash, "base64url");
    const key = await scrypt(plain, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
    return key.length === expected.length && timingSafeEqual(key, expected);
  }
}
