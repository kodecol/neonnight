import { createContainer, type Container } from "../container";
import { fingerprint, tenantDbName, tenantInstanceConfig, type Env, type TenantRecord } from "../config/instance";
import { mongoClient } from "../mongo/client";
import { TtlLru } from "./lru";
import { MongoTenantRegistry, type TenantRegistry } from "./registry";

/** Lo que el demo host sabe de una petición según su host. */
export type Resolution =
  | { kind: "ok"; tenant: TenantRecord; container: Container }
  | { kind: "expired"; tenant: TenantRecord }
  | { kind: "not-found" };

/** "Aurora-Joyeria.demo.kodecol.co:443." → "aurora-joyeria.demo.kodecol.co" */
export function normalizeHost(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
}

export const RESERVED_SLUGS = new Set(["www", "admin", "api", "demo", "mail", "kode"]);

/**
 * Demo host (`TENANCY=multi`): resuelve el tenant por el host de la petición y
 * le da su contenedor (repositorios sobre su base, su URL, su clave de sesión).
 * - Hosts fuera de DEMO_ZONE: no existen (404) sin consultar el registro.
 * - Registro en una LRU de 30 s (también los "no existe", para que un host
 *   inventado no golpee la base); Kode invalida al cambiar un tenant.
 * - Contenedores en una LRU por slug + huella de su configuración: si Kode
 *   cambia hosts o caducidad, el contenedor se rehace solo.
 */
export class DemoHost {
  private readonly hosts = new TtlLru<string, TenantRecord | null>(500, 30_000);
  private readonly containers = new TtlLru<string, Container>(200, 0);

  constructor(
    readonly registry: TenantRegistry,
    private readonly env: Env = process.env,
    private readonly now: () => Date = () => new Date(),
    /** ¿El usuario del host puede leer la base de este tenant? (Kode retira permisos al borrar). */
    private readonly canRead: (t: TenantRecord) => Promise<boolean> = async () => true,
  ) {}

  get zone(): string {
    return normalizeHost(this.env.DEMO_ZONE);
  }

  inZone(host: string): boolean {
    const zone = this.zone;
    return Boolean(zone) && host.endsWith(`.${zone}`) && host.length > zone.length + 1;
  }

  async resolve(rawHost: string | null | undefined): Promise<Resolution> {
    const host = normalizeHost(rawHost);
    if (!this.inZone(host)) return { kind: "not-found" };
    let tenant = this.hosts.get(host);
    if (tenant === undefined) {
      tenant = await this.registry.findByHost(host);
      // Registrado pero sin permisos sobre su base (demo borrada a medias): como si no existiera.
      if (tenant && !(await this.canRead(tenant).catch(() => false))) tenant = null;
      this.hosts.set(host, tenant);
    }
    if (!tenant) return { kind: "not-found" };
    if (tenant.expiresAt.getTime() <= this.now().getTime()) return { kind: "expired", tenant };
    return { kind: "ok", tenant, container: this.containerFor(tenant) };
  }

  containerFor(tenant: TenantRecord): Container {
    const config = tenantInstanceConfig(tenant, this.env);
    const key = `${tenant.slug}:${fingerprint(config)}`;
    let c = this.containers.get(key);
    if (!c) {
      this.containers.deleteWhere((_, k) => k.startsWith(`${tenant.slug}:`));
      c = createContainer({}, config);
      this.containers.set(key, c);
    }
    return c;
  }

  /** Kode cambió o borró un tenant: la próxima petición lo vuelve a leer. */
  invalidate(slug: string): void {
    this.hosts.deleteWhere((t) => t?.slug === slug);
    this.containers.deleteWhere((_, k) => k.startsWith(`${slug}:`));
  }

  /** También los "no existe" en caché (un tenant recién creado debe verse ya). */
  invalidateHosts(hosts: readonly string[]): void {
    for (const h of hosts) this.hosts.delete(normalizeHost(h));
  }
}

const g = globalThis as unknown as { __nnDemoHost?: DemoHost };

export function demoHost(): DemoHost {
  if (!g.__nnDemoHost) {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error("El demo host necesita MONGODB_URI.");
    g.__nnDemoHost = new DemoHost(new MongoTenantRegistry(uri), process.env, () => new Date(), async (t) => {
      try {
        await (await mongoClient(uri)).db(tenantDbName(t.slug)).listCollections({}, { nameOnly: true }).toArray();
        return true;
      } catch (e) {
        if (/not authorized|unauthorized/i.test(String(e))) {
          console.warn(`[demo-host] sin permisos sobre la base de ${t.slug}: no se sirve`);
          return false;
        }
        throw e;
      }
    });
  }
  return g.__nnDemoHost;
}

/** Solo para tests. */
export function setDemoHost(host: DemoHost | undefined): void {
  g.__nnDemoHost = host;
}
