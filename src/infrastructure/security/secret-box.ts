import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado simétrico AES-256-GCM para secretos guardados en la base
 * (llave secreta de Bold). La clave se deriva de ADMIN_SECRET: si se rota,
 * hay que volver a ingresar los secretos en el panel.
 */
const key = (secret: string) => createHash("sha256").update(`nn-settings:${secret}`).digest();

export function seal(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

/** Devuelve null si el texto está corrupto o se cifró con otro ADMIN_SECRET. */
export function open(sealed: string, secret: string): string | null {
  const [v, iv, tag, ct] = sealed.split(":");
  if (v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
