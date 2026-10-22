import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApplyBrandConfig } from "@/application/use-cases/admin/brand-config";
import { createContainer } from "../container";
import { mongoDb, mongoDbName } from "../mongo/client";
import { MongoBrandFingerprint } from "./brand-fingerprint";
import { resolveBrandAsset } from "./brand-assets";

/**
 * `STORE_BRAND_PACK=brands/<slug>/brand.json`: al arrancar, si la base nunca
 * recibió una marca, aplica ese pack antes de servir (Neon Night adopta la
 * plantilla sin ventana en la que se vea "Tu tienda"). Si ya hay una marca
 * aplicada, no hace nada: lo editado en el panel manda (para reaplicar a
 * propósito: `lifecycle.mjs brand:apply --file … --force`).
 * Si el pack falla, el arranque falla: mejor un despliegue que no pasa el
 * health que una tienda con la marca equivocada.
 */
export async function applyBrandPackOnBoot(env = process.env): Promise<{ status: "omitido" | "ya-aplicada" | "aplicada"; applied?: string[] }> {
  const file = env.STORE_BRAND_PACK?.trim();
  const uri = env.MONGODB_URI?.trim();
  if (!file || !uri) return { status: "omitido" };
  const db = mongoDb(uri, mongoDbName());
  const fingerprint = new MongoBrandFingerprint(db);
  if (await fingerprint.get()) return { status: "ya-aplicada" };
  const raw: unknown = JSON.parse(await readFile(resolve(process.cwd(), file), "utf8"));
  const c = createContainer();
  const result = await new ApplyBrandConfig({
    identity: c.identity,
    appearance: c.appearance,
    companySettings: c.companySettings,
    homeSettings: c.homeSettings,
    fingerprint,
    clock: c.clock,
    resolveAsset: (ref, alt) => resolveBrandAsset(ref, alt, c.identityUploader),
  }).execute(raw);
  return { status: "aplicada", applied: result.applied };
}
