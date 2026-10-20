import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

/**
 * Salud y versión desplegada. El despliegue espera `status: "ok"` y compara
 * `version` con el SHA publicado (un 200 de un contenedor viejo no basta).
 * `?deep=1` además consulta la base (comprueba la conexión a Atlas).
 */
export async function GET(req: Request) {
  const version = process.env.APP_VERSION || "dev";
  const db = process.env.MONGODB_URI ? "mongodb" : "memoria";
  const headers = { "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", version, db }, { headers });
  }
  try {
    const categories = await Promise.race([
      getContainer().categories.list(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    return NextResponse.json({ status: "ok", version, db, categories: categories.length }, { headers });
  } catch (e) {
    console.error("[health]", e);
    return NextResponse.json({ status: "error", version, db }, { status: 503, headers });
  }
}
