import type { Collection } from "mongodb";
import type { TenantRecord } from "../config/instance";
import { mongoClient } from "../mongo/client";

/** Documento de `demo_registry.tenants`: lo único del demo host que no vive en la base del tenant. */
interface TenantDoc {
  _id: string;
  hosts: string[];
  niche: string;
  whatsappNumber: string | null;
  expiresAt: Date;
  banner: boolean;
  mediaQuotaMb: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantRegistry {
  findByHost(host: string): Promise<TenantRecord | null>;
  get(slug: string): Promise<(TenantRecord & { createdAt: Date }) | null>;
  upsert(t: TenantRecord, now: Date): Promise<{ created: boolean }>;
  delete(slug: string): Promise<boolean>;
  list(): Promise<(TenantRecord & { createdAt: Date })[]>;
  ping(): Promise<number>;
}

export const REGISTRY_DB = "demo_registry";

const fromDoc = (d: TenantDoc): TenantRecord & { createdAt: Date } => ({
  slug: d._id,
  hosts: d.hosts,
  niche: d.niche,
  whatsappNumber: d.whatsappNumber,
  expiresAt: d.expiresAt,
  banner: d.banner,
  mediaQuotaMb: d.mediaQuotaMb,
  createdAt: d.createdAt,
});

/**
 * Registro en Mongo. El usuario del demo host solo tiene readWrite en esta
 * base (ADR 0013 de Kode): nada de comandos de clúster ni listDatabases.
 */
export class MongoTenantRegistry implements TenantRegistry {
  private indexed: Promise<void> | null = null;

  constructor(private readonly uri: string) {}

  private async col(): Promise<Collection<TenantDoc>> {
    const col = (await mongoClient(this.uri)).db(REGISTRY_DB).collection<TenantDoc>("tenants");
    this.indexed ??= col.createIndex({ hosts: 1 }, { unique: true }).then(() => undefined);
    await this.indexed;
    return col;
  }

  async findByHost(host: string): Promise<TenantRecord | null> {
    const d = await (await this.col()).findOne({ hosts: host });
    return d ? fromDoc(d) : null;
  }

  async get(slug: string) {
    const d = await (await this.col()).findOne({ _id: slug });
    return d ? fromDoc(d) : null;
  }

  async upsert(t: TenantRecord, now: Date): Promise<{ created: boolean }> {
    const r = await (await this.col()).updateOne(
      { _id: t.slug },
      { $set: { hosts: t.hosts, niche: t.niche, whatsappNumber: t.whatsappNumber, expiresAt: t.expiresAt, banner: t.banner, mediaQuotaMb: t.mediaQuotaMb, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return { created: r.upsertedCount === 1 };
  }

  async delete(slug: string): Promise<boolean> {
    return (await (await this.col()).deleteOne({ _id: slug })).deletedCount === 1;
  }

  async list() {
    return (await (await this.col()).find({}).sort({ createdAt: 1 }).toArray()).map(fromDoc);
  }

  async ping(): Promise<number> {
    return (await this.col()).countDocuments({ expiresAt: { $gt: new Date() } });
  }
}

/** Para tests y desarrollo sin Mongo. */
export class InMemoryTenantRegistry implements TenantRegistry {
  private readonly rows = new Map<string, TenantRecord & { createdAt: Date }>();

  async findByHost(host: string) {
    return [...this.rows.values()].find((t) => t.hosts.includes(host)) ?? null;
  }
  async get(slug: string) {
    return this.rows.get(slug) ?? null;
  }
  async upsert(t: TenantRecord, now: Date) {
    const prev = this.rows.get(t.slug);
    for (const h of t.hosts) {
      const owner = await this.findByHost(h);
      if (owner && owner.slug !== t.slug) throw new Error(`El host ${h} ya es de ${owner.slug}.`);
    }
    this.rows.set(t.slug, { ...t, createdAt: prev?.createdAt ?? now });
    return { created: !prev };
  }
  async delete(slug: string) {
    return this.rows.delete(slug);
  }
  async list() {
    return [...this.rows.values()];
  }
  async ping() {
    return [...this.rows.values()].filter((t) => t.expiresAt > new Date()).length;
  }
}
