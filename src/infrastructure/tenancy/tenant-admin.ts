import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import type { Db } from "mongodb";
import { ApplyBrandConfig } from "@/application/use-cases/admin/brand-config";
import { SeedDemoCatalog } from "@/application/use-cases/admin/seed-demo";
import { STORE_SLUG } from "@/application/dto/brand-config.dto";
import { MIN_PASSWORD_LENGTH } from "@/application/dto/account.dto";
import { demoMediaPrefix, tenantDbName, type TenantRecord } from "../config/instance";
import { DEMO_NICHES, demoPack } from "../cms/demo";
import { mongoClient, forgetMongoDb, mongoDb } from "../mongo/client";
import { MongoBrandFingerprint } from "../brand/brand-fingerprint";
import { resolveBrandAsset } from "../brand/brand-assets";
import { ScryptPasswordHasher } from "../auth/password";
import { normalizeHost, RESERVED_SLUGS, type DemoHost } from "./demo-host";

/**
 * Altas, cambios y bajas de demos: lo que Kode pide por la API firmada
 * (`/api/_kode/tenants`). Cada tenant es una base propia (`demo_<slug>`) más
 * su fila en `demo_registry.tenants` y sus medios en Cloudinary `demos/<slug>/`.
 */

/** Subdominios reales de la zona: nunca pueden ser una demo. */
const ZONE_RESERVED = ["autoconfig", "autodiscover", "cpanel", "cpcalendars", "cpcontacts", "ftp", "kode", "mail", "webdisk", "webmail", "whm", "www", "app", "panel", "ns1", "ns2"];

export const TenantUpsertSchema = z.object({
  brand: z.record(z.string(), z.unknown()),
  niche: z.enum(DEMO_NICHES),
  hosts: z.array(z.string().trim().toLowerCase().max(253)).min(1).max(5),
  expires_at: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  admin_password: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
  banner: z.boolean().default(true),
  media_quota_mb: z.number().int().min(1).max(1000).default(50),
});
export type TenantUpsertInput = z.input<typeof TenantUpsertSchema>;

export class TenantInputError extends Error {
  constructor(
    readonly code: "invalid_input" | "invalid_brand" | "host_not_in_zone" | "conflict" | "not_authorized",
    message: string,
  ) {
    super(message);
  }
}

export type TenantStatus = "active" | "expired";

export class TenantAdmin {
  constructor(
    private readonly host: DemoHost,
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private validSlug(slug: string): void {
    if (!STORE_SLUG.test(slug) || RESERVED_SLUGS.has(slug) || ZONE_RESERVED.includes(slug)) {
      throw new TenantInputError("invalid_input", `Slug no válido o reservado: ${slug}`);
    }
  }

  /** Cada host debe ser exactamente `<algo>.<DEMO_ZONE>` (un nivel). */
  private validHosts(hosts: readonly string[]): string[] {
    const zone = this.host.zone;
    return hosts.map((raw) => {
      const h = normalizeHost(raw);
      const label = h.endsWith(`.${zone}`) ? h.slice(0, -(zone.length + 1)) : "";
      if (!zone || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label) || ZONE_RESERVED.includes(label)) {
        throw new TenantInputError("host_not_in_zone", `El host ${raw} no es un subdominio válido de ${zone || "(sin DEMO_ZONE)"}.`);
      }
      return h;
    });
  }

  async upsert(slug: string, raw: unknown) {
    this.validSlug(slug);
    const parsed = TenantUpsertSchema.safeParse(raw);
    if (!parsed.success) throw new TenantInputError("invalid_input", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    const input = parsed.data;
    const hosts = this.validHosts(input.hosts);
    for (const h of hosts) {
      const owner = await this.host.registry.findByHost(h);
      if (owner && owner.slug !== slug) throw new TenantInputError("conflict", `El host ${h} ya es de la demo ${owner.slug}.`);
    }
    const previous = await this.host.registry.get(slug);
    if (!previous && !input.admin_password) throw new TenantInputError("invalid_input", "Una demo nueva necesita admin_password.");

    const company = (input.brand as { company?: { whatsapp?: string } }).company;
    const record: TenantRecord = {
      slug,
      hosts,
      niche: input.niche,
      whatsappNumber: company?.whatsapp ?? null,
      expiresAt: input.expires_at,
      banner: input.banner,
      mediaQuotaMb: input.media_quota_mb,
    };
    const c = this.host.containerFor(record);

    // Marca: brand:apply es idempotente (huella en meta/brand de la base del tenant).
    let applied: string[] = [];
    try {
      const result = await new ApplyBrandConfig({
        identity: c.identity,
        appearance: c.appearance,
        companySettings: c.companySettings,
        homeSettings: c.homeSettings,
        fingerprint: new MongoBrandFingerprint(mongoDb(c.config.db!.uri, c.config.db!.name)),
        clock: c.clock,
        resolveAsset: (ref, alt) => resolveBrandAsset(ref, alt, c.identityUploader),
      }).execute(input.brand);
      applied = result.applied;
    } catch (e) {
      if (e instanceof z.ZodError) throw new TenantInputError("invalid_brand", e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      throw this.authOr(e);
    }

    // Catálogo de demo solo al crear (nunca pisa lo que el prospecto editó).
    const seeded = previous ? null : await new SeedDemoCatalog(c).execute(input.niche, demoPack(input.niche)).catch((e: unknown) => Promise.reject(this.authOr(e)));

    if (input.admin_password) {
      const prev = await c.adminCredentials.get();
      await c.adminCredentials.save({
        passwordHash: await new ScryptPasswordHasher().hash(input.admin_password),
        sessionVersion: (prev?.sessionVersion ?? 0) + 1,
        passwordChangedAt: this.now(),
      });
    }

    const { created } = await this.host.registry.upsert(record, this.now());
    this.host.invalidate(slug);
    this.host.invalidateHosts([...hosts, ...(previous?.hosts ?? [])]);
    return { slug, db: tenantDbName(slug), created, seeded: Boolean(seeded), status: this.statusOf(record), applied, expires_at: record.expiresAt.toISOString() };
  }

  async delete(slug: string) {
    this.validSlug(slug);
    const previous = await this.host.registry.get(slug);
    const uri = this.env.MONGODB_URI!;
    const name = tenantDbName(slug);
    const method = await this.dropTenantDb(uri, name);
    forgetMongoDb(uri, name);
    await this.deleteMedia(slug);
    const deleted = await this.host.registry.delete(slug);
    this.host.invalidate(slug);
    if (previous) this.host.invalidateHosts(previous.hosts);
    return { slug, deleted: deleted || Boolean(previous), method };
  }

  async list() {
    const rows = await this.host.registry.list();
    return { tenants: rows.map((t) => ({ slug: t.slug, hosts: t.hosts, niche: t.niche, status: this.statusOf(t), expires_at: t.expiresAt.toISOString(), created_at: t.createdAt.toISOString() })) };
  }

  private statusOf(t: TenantRecord): TenantStatus {
    return t.expiresAt.getTime() > this.now().getTime() ? "active" : "expired";
  }

  /** dropDatabase si el usuario tiene dbAdmin; si no, colección por colección (una base vacía desaparece). */
  private async dropTenantDb(uri: string, name: string): Promise<"dropDatabase" | "collections"> {
    const db: Db = (await mongoClient(uri)).db(name);
    try {
      await db.dropDatabase();
      return "dropDatabase";
    } catch (e) {
      if (!isUnauthorized(e)) throw e;
      for (const col of await db.listCollections({}, { nameOnly: true }).toArray()) await db.collection(col.name).drop();
      return "collections";
    }
  }

  private async deleteMedia(slug: string): Promise<void> {
    if (this.env.CLOUDINARY_URL) await deleteDemoMedia(slug);
  }

  private authOr(e: unknown): unknown {
    return isUnauthorized(e) ? new TenantInputError("not_authorized", "El usuario de Mongo no tiene permisos sobre la base de esta demo.") : e;
  }
}

export const isUnauthorized = (e: unknown) => /not authorized|unauthorized/i.test(e instanceof Error ? e.message : String(e));

/**
 * Borra en Cloudinary SOLO `demos/<slug>/` (la cuenta es la de la tienda
 * real): prefijo exacto, con el slug validado y la barra final, para que
 * borrar `demos/aurora` no se lleve `demos/aurora-joyeria`.
 */
export async function deleteDemoMedia(slug: string, api: Pick<typeof cloudinary.api, "delete_resources_by_prefix"> = cloudinary.api): Promise<void> {
  const prefix = demoMediaPrefix(slug);
  if (!/^demos\/[a-z][a-z0-9-]{1,30}[a-z0-9]\/$/.test(prefix)) throw new Error(`Prefijo de medios no permitido: ${prefix}`);
  for (const resource_type of ["image", "video"] as const) await api.delete_resources_by_prefix(prefix, { resource_type });
}
