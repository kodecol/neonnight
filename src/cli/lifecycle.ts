/**
 * Ciclo de vida de una instancia de la plantilla `jewelry-store` (lo invoca la
 * plataforma Kodecol; ver template.manifest.json y docs/MARCA-BLANCA.md).
 * Se empaqueta en `lifecycle.mjs` dentro de la imagen y corre sin el servidor:
 *
 *   node lifecycle.mjs migrate
 *   node lifecycle.mjs brand:apply --file /ruta/brand.json [--force]
 *   node lifecycle.mjs seed --niche <relojeria|joyeria|perfumeria|ecommerce|vacio> [--force]
 *   node lifecycle.mjs info
 *
 * Contrato: una línea JSON en stdout (`{"ok":true,...}` o `{"ok":false,"error":...}`)
 * y código de salida 0 si salió bien, 1 si falló la validación o la operación,
 * 2 si el uso es incorrecto. Todo es idempotente.
 */
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { ZodError } from "zod";
import { DomainError } from "@/domain/errors";
import { ApplyBrandConfig } from "@/application/use-cases/admin/brand-config";
import { SeedDemoCatalog } from "@/application/use-cases/admin/seed-demo";
import { TEMPLATE } from "@/application/lib/template-info";
import { createContainer } from "@/infrastructure/container";
import { mongoDb, mongoDbName } from "@/infrastructure/mongo/client";
import { runMigrations, SCHEMA_VERSION, schemaVersionOf } from "@/infrastructure/mongo/migrations";
import { MongoBrandFingerprint } from "@/infrastructure/brand/brand-fingerprint";
import { resolveBrandAsset } from "@/infrastructure/brand/brand-assets";
import { DEMO_NICHES, demoPack, isDemoNiche } from "@/infrastructure/cms/demo";

class UsageError extends Error {}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function requireDb(): { uri: string; name: string } {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new UsageError("Falta MONGODB_URI: el ciclo de vida trabaja sobre la base de la instancia.");
  return { uri, name: mongoDbName() };
}

async function withDb<T>(fn: (db: import("mongodb").Db) => Promise<T>): Promise<T> {
  const { uri, name } = requireDb();
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  try {
    return await fn(client.db(name));
  } finally {
    await client.close();
  }
}

const commands: Record<string, () => Promise<Record<string, unknown>>> = {
  async info() {
    return { template: TEMPLATE, schema_version: SCHEMA_VERSION, niches: DEMO_NICHES };
  },

  async migrate() {
    const r = await withDb(runMigrations);
    return { command: "migrate", ...r, schema_version: r.to };
  },

  async "brand:apply"() {
    const file = arg("file");
    if (!file) throw new UsageError("Uso: brand:apply --file <ruta/brand.json>");
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      throw new UsageError(`No se pudo leer ${file}: ${(e as Error).message}`);
    }
    requireDb();
    await withDb(runMigrations);
    const c = createContainer();
    const db = mongoDb(process.env.MONGODB_URI!, mongoDbName());
    const result = await new ApplyBrandConfig({
      identity: c.identity,
      appearance: c.appearance,
      companySettings: c.companySettings,
      homeSettings: c.homeSettings,
      fingerprint: new MongoBrandFingerprint(db),
      clock: c.clock,
      resolveAsset: (ref, alt) => resolveBrandAsset(ref, alt, c.identityUploader),
    }).execute(raw, { force: flag("force") });
    return { command: "brand:apply", ...result };
  },

  async seed() {
    const niche = arg("niche");
    if (!niche || !isDemoNiche(niche)) throw new UsageError(`Uso: seed --niche <${DEMO_NICHES.join("|")}>`);
    requireDb();
    await withDb(runMigrations);
    const c = createContainer();
    const result = await new SeedDemoCatalog(c).execute(niche, demoPack(niche), { force: flag("force") });
    return { command: "seed", ...result };
  },
};

async function main(): Promise<number> {
  const name = process.argv[2] ?? "";
  const run = commands[name];
  if (!run) {
    out({ ok: false, error: `Comando desconocido "${name}". Usa: ${Object.keys(commands).join(", ")}.` });
    return 2;
  }
  try {
    const result = await run();
    if (name !== "info" && name !== "migrate") result.schema_version = await withDb(schemaVersionOf);
    out({ ok: true, ...result });
    return 0;
  } catch (e) {
    if (e instanceof UsageError) {
      out({ ok: false, error: e.message });
      return 2;
    }
    if (e instanceof ZodError) {
      out({ ok: false, error: "brand.json no es válido.", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
      return 1;
    }
    out({ ok: false, error: e instanceof DomainError || e instanceof Error ? e.message : String(e) });
    return 1;
  }
}

function out(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    out({ ok: false, error: String(e) });
    process.exit(1);
  },
);
