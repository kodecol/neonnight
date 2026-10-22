import { NextResponse } from "next/server";
import { tenancy } from "@/infrastructure/config/instance";
import { demoHost } from "@/infrastructure/tenancy/demo-host";
import { MongoNonceStore, verifyKodeRequest, type NonceStore } from "@/infrastructure/tenancy/kode-auth";
import { TenantAdmin, TenantInputError } from "@/infrastructure/tenancy/tenant-admin";

/**
 * Entrada de Kode al demo host (`/api/_kode/*`, contrato §11). Solo existe
 * con TENANCY=multi; responde en cualquier host (el dominio principal del
 * sitio queda fuera de DEMO_ZONE): la firma HMAC es la que autoriza.
 */
const g = globalThis as unknown as { __nnNonces?: NonceStore };

export async function kodeHandler(req: Request, run: (admin: TenantAdmin, body: string) => Promise<Record<string, unknown>>): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (tenancy() !== "multi") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers });
  const body = await req.text();
  g.__nnNonces ??= new MongoNonceStore(process.env.MONGODB_URI!);
  const auth = await verifyKodeRequest(req, body, { key: process.env.KODE_HOST_KEY, nonces: g.__nnNonces });
  if (!auth.ok) {
    console.warn("[kode-api]", auth.reason);
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers });
  }
  try {
    const result = await run(new TenantAdmin(demoHost()), body);
    return NextResponse.json({ ok: true, ...result }, { headers });
  } catch (e) {
    if (e instanceof TenantInputError) {
      const status = e.code === "conflict" ? 409 : e.code === "not_authorized" ? 503 : 422;
      return NextResponse.json({ ok: false, error: e.code, message: e.message }, { status, headers });
    }
    if (e instanceof SyntaxError) return NextResponse.json({ ok: false, error: "invalid_input", message: "JSON inválido." }, { status: 400, headers });
    console.error("[kode-api]", e);
    return NextResponse.json({ ok: false, error: "internal", message: "Error interno." }, { status: 500, headers });
  }
}
