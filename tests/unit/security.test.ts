import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/infrastructure/auth/session";
import { checkAdminPassword } from "@/infrastructure/auth/password";
import { open, seal } from "@/infrastructure/security/secret-box";

const SECRET = "x".repeat(40);

describe("Sesión del admin", () => {
  it("firma y verifica; caduca y rechaza manipulaciones", async () => {
    const now = Date.UTC(2026, 9, 3);
    const token = await createSessionToken(SECRET, now);
    expect(await verifySessionToken(token, SECRET, now + 1000)).toBe(true);
    expect(await verifySessionToken(token, SECRET, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBe(false);
    expect(await verifySessionToken(token, "y".repeat(40), now)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(await verifySessionToken(`${Number(exp) + 999}.${sig}`, SECRET, now)).toBe(false);
    expect(await verifySessionToken(undefined, SECRET, now)).toBe(false);
    expect(await verifySessionToken("basura", SECRET, now)).toBe(false);
  });

  it("compara la contraseña y falla si no está configurada", () => {
    expect(checkAdminPassword("clave", "clave")).toBe(true);
    expect(checkAdminPassword("clave ", "clave")).toBe(false);
    expect(checkAdminPassword("", "")).toBe(false);
  });
});

describe("Cifrado de secretos", () => {
  it("ida y vuelta; null con otra llave o texto corrupto", () => {
    const sealed = seal("sk_live_abc", SECRET);
    expect(sealed).not.toContain("sk_live_abc");
    expect(open(sealed, SECRET)).toBe("sk_live_abc");
    expect(open(sealed, "z".repeat(40))).toBeNull();
    expect(open("v1:basura", SECRET)).toBeNull();
  });
});
