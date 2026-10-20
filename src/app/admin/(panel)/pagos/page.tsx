import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetPaymentSettings } from "@/application/use-cases/admin/payment-settings";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { PaymentSettingsForm } from "@/presentation/components/admin/PaymentSettingsForm";
import { absoluteUrl } from "@/presentation/lib/site";
import { savePaymentSettingsAction } from "./actions";

export const metadata: Metadata = { title: "Pagos" };

export default async function PaymentsPage() {
  const settings = await new GetPaymentSettings(getContainer().paymentSettings).execute();
  return (
    <>
      <AdminPageHeader kicker="Pasarela de pago" title="Pagos" />
      <PaymentSettingsForm initial={settings} webhookUrl={absoluteUrl("/api/webhooks/bold")} save={savePaymentSettingsAction} />
    </>
  );
}
