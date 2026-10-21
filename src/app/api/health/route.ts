import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { TEMPLATE } from "@/application/lib/template-info";
import { SCHEMA_VERSION } from "@/infrastructure/mongo/migrations";

export const dynamic = "force-dynamic";

/**
 * Salud y versión desplegada. El despliegue espera `status: "ok"` y compara
 * `sha` (alias `version`) con el SHA publicado: un 200 de un contenedor viejo
 * no basta. `template` y `schema_version` son los de la plantilla para Kodecol.
 * `?deep=1` además consulta la base (comprueba la conexión).
 */
export async function GET(req: Request) {
  const sha = process.env.APP_VERSION || "dev";
  const db = process.env.MONGODB_URI ? "mongodb" : "memoria";
  const base = { sha, version: sha, template: TEMPLATE, schema_version: SCHEMA_VERSION, db };
  const headers = { "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", ...base }, { headers });
  }
  try {
    const categories = await Promise.race([
      getContainer().categories.list(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    return NextResponse.json({ status: "ok", ...base, categories: categories.length }, { headers });
  } catch (e) {
    console.error("[health]", e);
    return NextResponse.json({ status: "error", ...base }, { status: 503, headers });
  }
}
