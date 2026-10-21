import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { SESSION_TTL_SECONDS, createSessionToken, readSessionToken, verifySessionToken } from "@/infrastructure/auth/session";
import { ScryptPasswordHasher, checkAdminPassword } from "@/infrastructure/auth/password";
import { InMemoryLoginThrottle } from "@/infrastructure/auth/login-throttle";
import { InMemoryAdminCredentialsRepository } from "@/infrastructure/repositories/in-memory-admin-credentials-repository";
import { AdminAccount } from "@/application/use-cases/admin/account";
import { FieldValidationError } from "@/application/lib/errors";
import { open, seal } from "@/infrastructure/security/secret-box";

const SECRET = "x".repeat(40);

describe("Sesión del admin", () => {
  it("firma y verifica; caduca y rechaza manipulaciones", async () => {
    const now = Date.UTC(2026, 9, 3);
    const token = await createSessionToken(SECRET, 0, now);
    expect(await verifySessionToken(token, SECRET, now + 1000)).toBe(true);
    expect(await verifySessionToken(token, SECRET, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBe(false);
    expect(await verifySessionToken(token, "y".repeat(40), now)).toBe(false);
    const [exp, ver, sig] = token.split(".");
    expect(await verifySessionToken(`${Number(exp) + 999}.${ver}.${sig}`, SECRET, now)).toBe(false);
    expect(await verifySessionToken(`${exp}.v7.${sig}`, SECRET, now)).toBe(false);
    expect(await verifySessionToken(undefined, SECRET, now)).toBe(false);
    expect(await verifySessionToken("basura", SECRET, now)).toBe(false);
  });

  it("lleva la versión firmada y acepta el formato anterior como versión 0", async () => {
    const now = Date.UTC(2026, 9, 3);
    expect(await readSessionToken(await createSessionToken(SECRET, 3, now), SECRET, now)).toEqual({ version: 3 });
    // Cookie emitida antes del cambio: `<exp>.<firma de "nn-session:<exp>">`.
    const exp = String(Math.floor(now / 1000) + 60);
    const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = Buffer.from(await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(`nn-session:${exp}`))).toString("base64url");
    expect(await readSessionToken(`${exp}.${sig}`, SECRET, now)).toEqual({ version: 0 });
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

describe("Hash de contraseñas", () => {
  it("scrypt: verifica, rechaza otra y no guarda el texto plano", async () => {
    const h = new ScryptPasswordHasher();
    const stored = await h.hash("una frase bastante larga");
    expect(stored.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(stored).not.toContain("frase");
    expect(await h.verify("una frase bastante larga", stored)).toBe(true);
    expect(await h.verify("una frase bastante larg", stored)).toBe(false);
    expect(await h.verify("x", "md5$abc")).toBe(false);
    expect(await h.hash("igual")).not.toBe(await h.hash("igual"));
  });
});

describe("Cuenta del administrador", () => {
  const clock = { now: () => new Date(Date.UTC(2026, 9, 21, 12)) };
  function account(env = "inicial-del-entorno") {
    const credentials = new InMemoryAdminCredentialsRepository();
    const throttles = { perIp: new InMemoryLoginThrottle(5, 15 * 60_000), global: new InMemoryLoginThrottle(50, 15 * 60_000) };
    const acc = new AdminAccount({ credentials, hasher: new ScryptPasswordHasher(), clock, checkEnvPassword: (p) => checkAdminPassword(p, env), throttles });
    return { acc, credentials };
  }

  it("entra con ADMIN_PASSWORD mientras no haya hash; tras cambiarla, solo con la nueva", async () => {
    const { acc } = account();
    expect(await acc.login("inicial-del-entorno", "1.1.1.1")).toEqual({ ok: true, version: 0 });
    const version = await acc.changePassword({ current: "inicial-del-entorno", next: "frase nueva y larga", confirm: "frase nueva y larga" });
    expect(version).toBe(1);
    expect(await acc.login("inicial-del-entorno", "1.1.1.1")).toEqual({ ok: false, reason: "invalid" });
    expect(await acc.login("frase nueva y larga", "1.1.1.1")).toEqual({ ok: true, version: 1 });
    expect((await acc.view()).stored).toBe(true);
  });

  it("valida el cambio: actual, longitud, confirmación y distinta", async () => {
    const { acc } = account();
    const field = async (input: object) => {
      try {
        await acc.changePassword(input);
        return null;
      } catch (e) {
        return e instanceof FieldValidationError ? e.field : "zod";
      }
    };
    expect(await field({ current: "mal", next: "frase nueva y larga", confirm: "frase nueva y larga" })).toBe("current");
    expect(await field({ current: "inicial-del-entorno", next: "corta", confirm: "corta" })).toBe("zod");
    expect(await field({ current: "inicial-del-entorno", next: "frase nueva y larga", confirm: "otra cosa distinta" })).toBe("confirm");
    expect(await field({ current: "inicial-del-entorno", next: "inicial-del-entorno", confirm: "inicial-del-entorno" })).toBe("next");
  });

  it("cerrar sesiones sube la versión sin tocar la contraseña", async () => {
    const { acc, credentials } = account();
    expect(await acc.revokeAllSessions()).toBe(1);
    expect((await credentials.get())?.passwordHash).toBeNull();
    expect(await acc.login("inicial-del-entorno", "1.1.1.1")).toEqual({ ok: true, version: 1 });
    expect(await acc.sessionVersion()).toBe(1);
  });

  it("frena tras 5 fallos por IP, sin bloquear otras IPs; el éxito limpia el contador", async () => {
    const { acc } = account();
    for (let i = 0; i < 5; i++) expect((await acc.login("mal", "9.9.9.9")).ok).toBe(false);
    const blocked = await acc.login("inicial-del-entorno", "9.9.9.9");
    expect(blocked.ok === false && blocked.reason === "throttled" && blocked.retryAfter > 0).toBe(true);
    expect((await acc.login("inicial-del-entorno", "8.8.8.8")).ok).toBe(true);
  });

  it("la ventana del freno vence", () => {
    const t = new InMemoryLoginThrottle(2, 1000);
    t.fail("k", 0);
    t.fail("k", 100);
    expect(t.retryAfter("k", 500)).toBe(1);
    expect(t.retryAfter("k", 1001)).toBe(0);
  });
});
