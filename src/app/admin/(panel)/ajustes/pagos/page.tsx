import type { Metadata } from "next";
import { GetPaymentSettings } from "@/application/use-cases/admin/payment-settings";
import { PaymentSettingsForm } from "@/presentation/components/admin/PaymentSettingsForm";
import { absoluteUrl } from "@/presentation/lib/site";
import { savePaymentSettingsAction } from "./actions";
import { requireAdmin } from "../../../_lib/auth";
import { container, siteBaseUrl } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Pagos · Ajustes" };

export default async function PaymentsPage() {
  const siteBase = await siteBaseUrl();
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  const settings = await new GetPaymentSettings((await container()).paymentSettings).execute();
  return (
    <PaymentSettingsForm initial={settings} webhookUrl={absoluteUrl("/api/webhooks/bold", siteBase)} save={savePaymentSettingsAction} />
  );
}
