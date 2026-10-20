/**
 * Sesión del único administrador: cookie `<expira>.<firma>` firmada con
 * HMAC-SHA256 (ADMIN_SECRET). Solo Web Crypto, para que sirva igual en el
 * middleware (edge) y en las server actions (Node).
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

export async function createSessionToken(secret: string, nowMs = Date.now()): Promise<string> {
  const exp = String(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  return `${exp}.${await sign(exp, secret)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowMs = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 <= nowMs) return false;
  return safeEqual(sig, await sign(exp, secret));
}
