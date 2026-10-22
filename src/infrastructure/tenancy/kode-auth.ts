import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mongoClient } from "../mongo/client";
import { REGISTRY_DB } from "./registry";

/**
 * Firma de las llamadas de Kode al demo host (contrato §11 del plan):
 *   X-Kode-Signature: v1=hex(HMAC_SHA256(KODE_HOST_KEY,
 *     METHOD \n PATH \n TIMESTAMP \n NONCE \n sha256hex(cuerpo)))
 * con ventana de ±300 s y nonce de un solo uso (guardado 10 min con TTL).
 */
export const WINDOW_S = 300;

export function kodeSignature(key: string, method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", key).update([method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n")).digest("hex");
}

export interface NonceStore {
  /** true si el nonce es nuevo (y queda registrado); false si ya se usó. */
  claim(nonce: string, now: Date): Promise<boolean>;
}

export class MongoNonceStore implements NonceStore {
  private indexed: Promise<unknown> | null = null;

  constructor(private readonly uri: string) {}

  async claim(nonce: string, now: Date): Promise<boolean> {
    const col = (await mongoClient(this.uri)).db(REGISTRY_DB).collection<{ _id: string; at: Date }>("nonces");
    this.indexed ??= col.createIndex({ at: 1 }, { expireAfterSeconds: 600 });
    await this.indexed;
    try {
      await col.insertOne({ _id: nonce, at: now });
      return true;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return false;
      throw e;
    }
  }
}

export class InMemoryNonceStore implements NonceStore {
  private readonly seen = new Map<string, number>();
  async claim(nonce: string, now: Date): Promise<boolean> {
    for (const [n, at] of this.seen) if (now.getTime() - at > 600_000) this.seen.delete(n);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, now.getTime());
    return true;
  }
}

export type KodeAuthResult = { ok: true } | { ok: false; reason: string };

export async function verifyKodeRequest(
  req: { method: string; url: string; headers: Headers },
  body: string,
  opts: { key: string | undefined; nonces: NonceStore; now?: Date },
): Promise<KodeAuthResult> {
  const key = opts.key ?? "";
  if (key.length < 32) return { ok: false, reason: "host sin KODE_HOST_KEY" };
  const ts = req.headers.get("x-kode-timestamp") ?? "";
  const nonce = req.headers.get("x-kode-nonce") ?? "";
  const sig = (req.headers.get("x-kode-signature") ?? "").replace(/^v1=/, "");
  if (!/^\d{9,11}$/.test(ts) || !/^[a-f0-9]{32,128}$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(sig)) return { ok: false, reason: "cabeceras de firma inválidas" };
  const now = opts.now ?? new Date();
  if (Math.abs(now.getTime() / 1000 - Number(ts)) > WINDOW_S) return { ok: false, reason: "fuera de la ventana" };
  const expected = kodeSignature(key, req.method, new URL(req.url).pathname, ts, nonce, body);
  const a = Buffer.from(sig.toLowerCase(), "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "firma inválida" };
  // El nonce se reclama al final: una firma mala no gasta nonces ajenos.
  if (!(await opts.nonces.claim(nonce.toLowerCase(), now))) return { ok: false, reason: "nonce repetido" };
  return { ok: true };
}
