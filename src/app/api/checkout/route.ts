import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getContainer } from "@/infrastructure/container";
import { Checkout, GetLegalVersions } from "@/application/use-cases/checkout";
import { FieldValidationError } from "@/application/lib/errors";
import { DomainError } from "@/domain/errors";
import { BoldGatewayError } from "@/infrastructure/payments/bold-payment-gateway";
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
    const c = getContainer();
    const legal = await new GetLegalVersions(c.content).execute();
    const result = await new Checkout(c).execute(body, { returnUrl: absoluteUrl(ROUTES.thanks), legal });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return NextResponse.json({ error: "Revisa los datos marcados.", fieldErrors }, { status: 400 });
    }
    if (e instanceof FieldValidationError) return NextResponse.json({ error: e.message, fieldErrors: { [e.field]: e.message } }, { status: 409 });
    if (e instanceof DomainError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof BoldGatewayError) {
      console.error("[checkout] Bold", e.message);
      return NextResponse.json({ error: "No pudimos abrir la pasarela de pago. Intenta de nuevo en unos minutos." }, { status: 502 });
    }
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
