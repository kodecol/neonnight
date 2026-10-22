import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { container as currentContainer } from "@/app/_lib/tenant";
import { QuoteCheckout } from "@/application/use-cases/checkout";

export const dynamic = "force-dynamic";

/** Resumen del pedido con precios y stock del servidor para /checkout (no crea nada). */
export async function POST(req: Request) {
  try {
    const result = await new QuoteCheckout((await currentContainer()).products).execute(await req.json());
    return NextResponse.json(result, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof ZodError || e instanceof SyntaxError) return NextResponse.json({ error: "Bolsa inválida." }, { status: 400 });
    console.error("[checkout:quote]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
