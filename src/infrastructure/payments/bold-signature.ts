import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica `x-bold-signature`: HMAC-SHA256 (hex) del cuerpo crudo codificado
 * en Base64, con la llave secreta. En modo pruebas Bold firma con llave vacía.
 */
export function verifyBoldWebhook(rawBody: string, signature: string | null, secretKey: string): boolean {
  if (!signature) return false;
  const expected = boldWebhookSignature(rawBody, secretKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function boldWebhookSignature(rawBody: string, secretKey: string): string {
  const encoded = Buffer.from(rawBody, "utf8").toString("base64");
  return createHmac("sha256", secretKey).update(encoded).digest("hex");
}

