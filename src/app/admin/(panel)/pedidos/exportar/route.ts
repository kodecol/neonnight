import { NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { ExportOrdersCsv, parseAdminOrderFilters } from "@/application/use-cases/admin/orders";
import { isAdmin } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

/**
 * CSV de los pedidos con los filtros de la lista (`?estado=&q=&desde=…`).
 * Lleva datos personales: verifica la sesión aquí mismo, porque el middleware
 * no corre para todo (p. ej. peticiones con cabecera `next-action`).
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const filters = parseAdminOrderFilters(Object.fromEntries(new URL(req.url).searchParams));
  const csv = await new ExportOrdersCsv(getContainer().orders).execute(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${filters.trash ? "eliminados-" : ""}${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
