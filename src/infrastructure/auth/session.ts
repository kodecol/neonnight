/**
 * Sesión del único administrador: cookie `<expira>.v<versión>.<firma>` firmada
 * con HMAC-SHA256 (ADMIN_SECRET). Solo Web Crypto, para que sirva igual en el
 * middleware (edge) y en las server actions (Node).
 *
 * La versión de sesión vive en la base (settings/admin): subirla —al cambiar la
 * contraseña o con "cerrar todas las sesiones"— invalida las cookies anteriores.
 * El middleware solo valida firma y vencimiento (sin base); la versión la
 * comprueba `isAdmin()` en el servidor, en cada página y acción del panel.
 * Las cookies del formato anterior (`<expira>.<firma>`) valen como versión 0.
 */
export const SESSION_COOKIE = "nn_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(`nn-session:${payload}`)));
}

/** Compara en tiempo constante (longitudes iguales). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function adminSecret(): string | null {
  const s = process.env.ADMIN_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

export async function createSessionToken(secret: string, version = 0, nowMs = Date.now()): Promise<string> {
  const exp = String(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  const ver = String(Math.max(0, Math.trunc(version)));
  return `${exp}.v${ver}.${await sign(`${exp}.${ver}`, secret)}`;
}

/** Firma y vencimiento válidos → versión de la sesión; si no, null. */
export async function readSessionToken(token: string | undefined, secret: string, nowMs = Date.now()): Promise<{ version: number } | null> {
  if (!token) return null;
  const parts = token.split(".");
  const exp = parts[0];
  if (!exp || !/^\d+$/.test(exp) || Number(exp) * 1000 <= nowMs) return null;
  if (parts.length === 2) {
    // Formato anterior, sin versión: válido como versión 0.
    return parts[1] && safeEqual(parts[1], await sign(exp, secret)) ? { version: 0 } : null;
  }
  const [, v, sig] = parts;
  if (parts.length !== 3 || !v || !sig || !/^v\d+$/.test(v)) return null;
  const ver = v.slice(1);
  return safeEqual(sig, await sign(`${exp}.${ver}`, secret)) ? { version: Number(ver) } : null;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowMs = Date.now()): Promise<boolean> {
  return (await readSessionToken(token, secret, nowMs)) !== null;
}
