import { describe, expect, it } from "vitest";
import { DemoHost, normalizeHost } from "@/infrastructure/tenancy/demo-host";
import { InMemoryTenantRegistry } from "@/infrastructure/tenancy/registry";
import { TtlLru } from "@/infrastructure/tenancy/lru";
import { singleInstanceConfig, tenantDbName, tenantInstanceConfig, tenantSecret, type TenantRecord } from "@/infrastructure/config/instance";
import { createSessionToken, readSessionToken } from "@/infrastructure/auth/session";

const ENV = { TENANCY: "multi", DEMO_ZONE: "demo.kodecol.co", MONGODB_URI: "mongodb://kode-mongo:27017", DEMO_MASTER_SECRET: "m".repeat(48), MEDIA_DIR: "/data/media" };
const tenant = (slug: string, over: Partial<TenantRecord> = {}): TenantRecord => ({
  slug,
  hosts: [`${slug}.demo.kodecol.co`],
  niche: "joyeria",
  whatsappNumber: null,
  expiresAt: new Date("2099-01-01T00:00:00Z"),
  banner: true,
  mediaQuotaMb: 50,
  ...over,
});

async function setup(now = new Date("2026-10-22T12:00:00Z")) {
  const registry = new InMemoryTenantRegistry();
  await registry.upsert(tenant("aurora-joyeria"), now);
  await registry.upsert(tenant("casa-brillo", { niche: "relojeria" }), now);
  await registry.upsert(tenant("vencida", { expiresAt: new Date("2026-10-01T00:00:00Z") }), now);
  return { registry, host: new DemoHost(registry, ENV, () => now) };
}

describe("Demo host: resolución del tenant por host", () => {
  it("normaliza mayúsculas, puerto y punto final", () => {
    expect(normalizeHost("Aurora-Joyeria.Demo.Kodecol.co:443")).toBe("aurora-joyeria.demo.kodecol.co");
    expect(normalizeHost("aurora-joyeria.demo.kodecol.co.")).toBe("aurora-joyeria.demo.kodecol.co");
  });

  it("solo resuelve hosts de la zona; lo demás no existe sin tocar el registro", async () => {
    const { host, registry } = await setup();
    let lookups = 0;
    const find = registry.findByHost.bind(registry);
    registry.findByHost = async (h) => (lookups++, find(h));
    for (const h of ["neonightonline.com", "demo.kodecol.co", "evil.com", "x.demo.kodecol.co.evil.com", "127.0.0.1:3000", null]) {
      expect((await host.resolve(h)).kind).toBe("not-found");
    }
    expect(lookups).toBe(0);
    expect((await host.resolve("nadie.demo.kodecol.co")).kind).toBe("not-found");
    expect(lookups).toBe(1);
    // El "no existe" también queda en caché: un host inventado no golpea la base cada vez.
    await host.resolve("nadie.demo.kodecol.co");
    expect(lookups).toBe(1);
  });

  it("cada tenant tiene su base, su URL, su slug y su clave; las demos van con prefijo DEMO", async () => {
    const { host } = await setup();
    const a = await host.resolve("aurora-joyeria.demo.kodecol.co");
    const b = await host.resolve("casa-brillo.demo.kodecol.co");
    if (a.kind !== "ok" || b.kind !== "ok") throw new Error("debían resolver");
    expect(a.container).not.toBe(b.container);
    expect(a.container.config).toMatchObject({ slug: "aurora-joyeria", siteUrl: "https://aurora-joyeria.demo.kodecol.co", db: { name: "demo_aurora_joyeria" }, orderPrefix: "DEMO" });
    expect(b.container.config.db?.name).toBe("demo_casa_brillo");
    expect(a.container.config.adminSecret).not.toBe(b.container.config.adminSecret);
    expect(a.container.config.media).toMatchObject({ dir: "/data/media/aurora-joyeria", cloudinary: false });
    expect(a.container.config.tracking).toEqual({ gaId: null, pixelId: null });
    // Mismo tenant → mismo contenedor (no se rehace por petición).
    const again = await host.resolve("AURORA-JOYERIA.demo.kodecol.co");
    expect(again.kind === "ok" && again.container).toBe(a.container);
  });

  it("una demo caducada responde como caducada, no como activa", async () => {
    const { host } = await setup();
    expect((await host.resolve("vencida.demo.kodecol.co")).kind).toBe("expired");
  });

  it("la sesión de un tenant no sirve en otro", async () => {
    const a = tenantSecret(ENV.DEMO_MASTER_SECRET, "aurora-joyeria");
    const b = tenantSecret(ENV.DEMO_MASTER_SECRET, "casa-brillo");
    const token = await createSessionToken(a, 0);
    expect(await readSessionToken(token, a)).toEqual({ version: 0 });
    expect(await readSessionToken(token, b)).toBeNull();
    // Otro maestro, otra clave.
    expect(tenantSecret("n".repeat(48), "aurora-joyeria")).not.toBe(a);
  });

  it("al cambiar un tenant, Kode invalida y la petición siguiente ve lo nuevo", async () => {
    const { host, registry } = await setup();
    const first = await host.resolve("aurora-joyeria.demo.kodecol.co");
    await registry.upsert(tenant("aurora-joyeria", { hosts: ["aurora.demo.kodecol.co"] }), new Date());
    // Sin invalidar, la LRU sigue con el host viejo (hasta 30 s).
    expect((await host.resolve("aurora-joyeria.demo.kodecol.co")).kind).toBe("ok");
    host.invalidate("aurora-joyeria");
    host.invalidateHosts(["aurora.demo.kodecol.co"]);
    expect((await host.resolve("aurora-joyeria.demo.kodecol.co")).kind).toBe("not-found");
    const moved = await host.resolve("aurora.demo.kodecol.co");
    expect(moved.kind).toBe("ok");
    expect(moved.kind === "ok" && first.kind === "ok" && moved.container !== first.container).toBe(true);
  });

  it("un host no puede pertenecer a dos tenants", async () => {
    const { registry } = await setup();
    await expect(registry.upsert(tenant("otra", { hosts: ["aurora-joyeria.demo.kodecol.co"] }), new Date())).rejects.toThrow(/ya es de aurora-joyeria/);
  });
});

describe("Configuración de instancia", () => {
  it("single: todo del entorno, como siempre (Neon Night)", () => {
    const c = singleInstanceConfig({ STORE_SLUG: "neonnight", STORE_ORDER_PREFIX: "NN", SITE_URL: "https://neonightonline.com/", MONGODB_URI: "mongodb+srv://x", MONGODB_DB: "neonnight", ADMIN_SECRET: "s".repeat(40), CLOUDINARY_URL: "cloudinary://k:s@c" });
    expect(c).toMatchObject({ slug: "neonnight", orderPrefix: "NN", siteUrl: "https://neonightonline.com", db: { name: "neonnight" }, demo: null });
    expect(c.media).toMatchObject({ cloudinary: true, folders: { site: "neonnight/sitio", catalogUploads: "neonnight/catalogo/subidas" } });
  });

  it("multi: exige el maestro y la URI", () => {
    expect(() => tenantInstanceConfig(tenant("a-b-c"), { ...ENV, DEMO_MASTER_SECRET: "corto" })).toThrow(/DEMO_MASTER_SECRET/);
    expect(() => tenantInstanceConfig(tenant("a-b-c"), { ...ENV, MONGODB_URI: "" })).toThrow(/MONGODB_URI/);
    expect(tenantDbName("a-b-c")).toBe("demo_a_b_c");
  });
});

describe("LRU con vencimiento", () => {
  it("expulsa el menos usado y vence por tiempo", () => {
    let t = 0;
    const lru = new TtlLru<string, number>(2, 1000, () => t);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.get("a");
    lru.set("c", 3);
    expect(lru.get("b")).toBeUndefined();
    expect(lru.get("a")).toBe(1);
    t = 2000;
    expect(lru.get("a")).toBeUndefined();
  });
});
