import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getContainer } from "@/infrastructure/container";
import { verifyBoldWebhook } from "@/infrastructure/payments/bold-signature";
import { ConfirmPayment } from "@/application/use-cases/confirm-payment";
import { webhookSecret } from "@/application/ports/payment-settings";

export const dynamic = "force-dynamic";

/**
 * Notificaciones de Bold (SALE_APPROVED, SALE_REJECTED…). Se verifica la
 * firma sobre el cuerpo crudo antes de parsear. Responde 200 salvo firma
 * inválida o error interno: Bold reintenta ante cualquier otro código.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const container = getContainer();
  const secret = webhookSecret(await container.paymentSettings.get());
  if (secret === null || !verifyBoldWebhook(raw, req.headers.get("x-bold-signature"), secret)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  try {
    const result = await new ConfirmPayment(container).execute(body);
    if (!result.handled) console.warn("[bold-webhook]", result.reason);
    if (result.handled && result.status === "pagada") revalidatePath("/", "layout");
    // Sin el motivo: no confirma a terceros qué pedidos existen.
    return NextResponse.json({ received: true, handled: result.handled }, { status: 200 });
  } catch (e) {
    console.error("[bold-webhook]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
