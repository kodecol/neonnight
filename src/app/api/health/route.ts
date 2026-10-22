import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { TEMPLATE } from "@/application/lib/template-info";
import { SCHEMA_VERSION } from "@/infrastructure/mongo/migrations";
import { tenancy } from "@/infrastructure/config/instance";
import { demoHost } from "@/infrastructure/tenancy/demo-host";

export const dynamic = "force-dynamic";

/**
 * Salud y versión desplegada. El despliegue espera `status: "ok"` y compara
 * `sha` (alias `version`) con el SHA publicado: un 200 de un contenedor viejo
 * no basta. `template` y `schema_version` son los de la plantilla para Kodecol.
 * `?deep=1` además consulta la base (comprueba la conexión).
 * En el demo host responde con cualquier host y sin tenant: lo sondean el
 * hosting y Kode desde el dominio principal del sitio.
 */
export async function GET(req: Request) {
  const sha = process.env.APP_VERSION || TEMPLATE.version;
  const mode = tenancy();
  const db = process.env.MONGODB_URI ? "mongodb" : "memoria";
  // Resultado del brand pack del arranque (solo si STORE_BRAND_PACK está puesta): aplicada | ya-aplicada | error.
  const brandPack = (globalThis as unknown as { __nnBrandPack?: string }).__nnBrandPack;
  const base = { sha, version: sha, template: TEMPLATE, schema_version: SCHEMA_VERSION, tenancy: mode, db, ...(brandPack ? { brand_pack: brandPack } : {}) };
  const headers = { "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", ...base }, { headers });
  }
  // Solo en deep: el hosting no expone métricas, Kode vigila el RSS por aquí.
  const mem = process.memoryUsage();
  const memory = { rss_mb: Math.round(mem.rss / 1048576), heap_used_mb: Math.round(mem.heapUsed / 1048576) };
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000));
    if (mode === "multi") {
      const tenants = await Promise.race([demoHost().registry.ping(), timeout]);
      return NextResponse.json({ status: "ok", ...base, tenants, memory }, { headers });
    }
    const categories = await Promise.race([getContainer().categories.list(), timeout]);
    return NextResponse.json({ status: "ok", ...base, categories: categories.length, memory }, { headers });
  } catch (e) {
    console.error("[health]", e);
    return NextResponse.json({ status: "error", ...base, memory }, { status: 503, headers });
  }
}
