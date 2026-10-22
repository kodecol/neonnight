import type { Metadata } from "next";
import { GetLegalVersions } from "@/application/use-cases/checkout";
import { paymentModeOf } from "@/application/ports/payment-settings";
import { Breadcrumb } from "@/presentation/components/blocks/Breadcrumb";
import { CheckoutView } from "@/presentation/components/checkout/CheckoutView";
import { ROUTES } from "@/presentation/lib/site";
import { container } from "@/app/_lib/tenant";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const c = (await container());
  const [site, settings, legal] = await Promise.all([c.content.get(), c.paymentSettings.get(), new GetLegalVersions(c.content).execute()]);
  const { policies } = site;
  return (
    <main className="px-page pb-section pt-header">
      <div className="pb-12 pt-12 md:pt-16">
        <Breadcrumb items={[{ label: site.collection.breadcrumbHome, href: ROUTES.home }, { label: "Finalizar compra" }]} />
        <h1 className="mb-0 mt-8 text-display-fluid uppercase">Finalizar compra</h1>
      </div>
      <CheckoutView
        mode={paymentModeOf(settings)}
        legal={legal}
        logos={site.home.payments.logos}
        whatsappUrl={c.whatsapp.generic()}
        privacyEmail={site.company.privacyEmail}
        reassurance={[
          policies.shipping.free ? "Envío asegurado sin costo" : "Envío asegurado",
          `${policies.returnDays} días para devolver`,
          `Garantía de ${policies.warrantyMonths} meses`,
        ].join(" · ")}
      />
    </main>
  );
}
