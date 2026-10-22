import { describe, expect, it, vi } from "vitest";
import { InMemoryNonceStore, kodeSignature, verifyKodeRequest } from "@/infrastructure/tenancy/kode-auth";
import { deleteDemoMedia } from "@/infrastructure/tenancy/tenant-admin";
import { demoMediaPrefix } from "@/infrastructure/config/instance";

const KEY = "k".repeat(48);
const NOW = new Date("2026-10-22T12:00:00Z");
const ts = String(Math.floor(NOW.getTime() / 1000));

function signed(method: string, path: string, body: string, over: { ts?: string; nonce?: string; key?: string } = {}) {
  const nonce = over.nonce ?? "a1".repeat(16);
  const t = over.ts ?? ts;
  const sig = kodeSignature(over.key ?? KEY, method, path, t, nonce, body);
  return { method, url: `https://darkslategray.example${path}?x=1`, headers: new Headers({ "x-kode-timestamp": t, "x-kode-nonce": nonce, "x-kode-signature": `v1=${sig}` }) };
}

describe("API de Kode: firma HMAC", () => {
  it("acepta una firma buena una sola vez (nonce)", async () => {
    const nonces = new InMemoryNonceStore();
    const body = JSON.stringify({ niche: "joyeria" });
    const req = signed("PUT", "/api/_kode/tenants/aurora-joyeria", body);
    expect(await verifyKodeRequest(req, body, { key: KEY, nonces, now: NOW })).toEqual({ ok: true });
    expect(await verifyKodeRequest(req, body, { key: KEY, nonces, now: NOW })).toEqual({ ok: false, reason: "nonce repetido" });
  });

  it("rechaza cuerpo, ruta, método o llave distintos, y fuera de la ventana", async () => {
    const nonces = new InMemoryNonceStore();
    const body = "{}";
    const ok = (r: Awaited<ReturnType<typeof verifyKodeRequest>>) => r.ok;
    expect(ok(await verifyKodeRequest(signed("PUT", "/api/_kode/tenants/a-b", body), "{ }", { key: KEY, nonces, now: NOW }))).toBe(false);
    expect(ok(await verifyKodeRequest({ ...signed("PUT", "/api/_kode/tenants/a-b", body, { nonce: "b2".repeat(16) }), url: "https://x/api/_kode/tenants/otra" }, body, { key: KEY, nonces, now: NOW }))).toBe(false);
    expect(ok(await verifyKodeRequest({ ...signed("PUT", "/api/_kode/tenants/a-b", body, { nonce: "c3".repeat(16) }), method: "DELETE" }, body, { key: KEY, nonces, now: NOW }))).toBe(false);
    expect(ok(await verifyKodeRequest(signed("PUT", "/api/_kode/tenants/a-b", body, { nonce: "d4".repeat(16), key: "z".repeat(48) }), body, { key: KEY, nonces, now: NOW }))).toBe(false);
    expect(ok(await verifyKodeRequest(signed("PUT", "/api/_kode/tenants/a-b", body, { nonce: "e5".repeat(16), ts: String(Number(ts) - 301) }), body, { key: KEY, nonces, now: NOW }))).toBe(false);
    expect(ok(await verifyKodeRequest(signed("PUT", "/api/_kode/tenants/a-b", body, { nonce: "f6".repeat(16) }), body, { key: "corta", nonces, now: NOW }))).toBe(false);
  });

  it("una firma mala no gasta el nonce de una petición legítima", async () => {
    const nonces = new InMemoryNonceStore();
    const body = "{}";
    const good = signed("GET", "/api/_kode/tenants", body);
    const forged = { ...good, headers: new Headers({ ...Object.fromEntries(good.headers), "x-kode-signature": `v1=${"0".repeat(64)}` }) };
    expect((await verifyKodeRequest(forged, body, { key: KEY, nonces, now: NOW })).ok).toBe(false);
    expect((await verifyKodeRequest(good, body, { key: KEY, nonces, now: NOW })).ok).toBe(true);
  });
});

describe("Medios de demos en la cuenta compartida de Cloudinary", () => {
  it("borra solo el prefijo exacto demos/<slug>/ (imágenes y videos)", async () => {
    const api = { delete_resources_by_prefix: vi.fn(async () => ({})) };
    await deleteDemoMedia("aurora", api as never);
    expect(api.delete_resources_by_prefix.mock.calls).toEqual([
      ["demos/aurora/", { resource_type: "image" }],
      ["demos/aurora/", { resource_type: "video" }],
    ]);
  });

  it("nunca borra con un slug inválido o vacío (ni fuera de demos/)", async () => {
    const api = { delete_resources_by_prefix: vi.fn(async () => ({})) };
    for (const slug of ["", "x", "../neonnight", "neonnight/catalogo", "Aurora", "a b c", "aurora-"]) {
      await expect(deleteDemoMedia(slug, api as never)).rejects.toThrow();
    }
    expect(api.delete_resources_by_prefix).not.toHaveBeenCalled();
    expect(demoMediaPrefix("aurora-joyeria")).toBe("demos/aurora-joyeria/");
  });
});
