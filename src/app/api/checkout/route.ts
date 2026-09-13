import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContainer } from "@/infrastructure/container";
import { Checkout } from "@/application/use-cases/checkout";
import { DomainError } from "@/domain/errors";
import { ROUTES, absoluteUrl } from "@/presentation/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  try {
    const result = await new Checkout(getContainer()).execute(body, absoluteUrl(ROUTES.thanks));
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Datos de la bolsa inválidos." }, { status: 400 });
    if (e instanceof DomainError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
