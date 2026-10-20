import type { InfoPage, InfoPageSlug } from "@/application/dto/info-page.dto";
import type { PageContext } from "./context";
import { aboutPage } from "./about";
import { shippingPage } from "./shipping";
import { paymentsPage } from "./payments";
import { warrantyPage } from "./warranty";
import { returnsPage } from "./returns";
import { termsPage } from "./terms";
import { privacyPage } from "./privacy";

/** Redacta todas las páginas institucionales y legales con los datos de `ctx`. */
export function buildInfoPages(ctx: PageContext): Record<InfoPageSlug, InfoPage> {
  return {
    nosotros: aboutPage(ctx),
    envios: shippingPage(ctx),
    pagos: paymentsPage(ctx),
    garantia: warrantyPage(ctx),
    devoluciones: returnsPage(ctx),
    terminos: termsPage(ctx),
    privacidad: privacyPage(ctx),
  };
}
