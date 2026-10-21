import type { SiteContent } from "@/application/dto/site-content.dto";
import { absoluteUrl } from "./site";

/**
 * Datos estructurados de schema.org que salen de las políticas de la tienda
 * (fuente única: `SiteContent.policies`). Google los usa para mostrar envío y
 * devoluciones junto al precio en los resultados.
 */
export function merchantReturnPolicy(site: Pick<SiteContent, "policies" | "company">) {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: site.company.countryCode,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: site.policies.returnDays,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    refundType: "https://schema.org/FullRefund",
    merchantReturnLink: absoluteUrl("/devoluciones"),
  };
}

export function shippingDetails(site: Pick<SiteContent, "policies" | "company">) {
  const { shipping } = site.policies;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: shipping.free ? 0 : undefined, currency: "COP" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: site.company.countryCode },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: shipping.handlingDays, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: shipping.transitMain[0], maxValue: shipping.transitOther[1], unitCode: "DAY" },
    },
  };
}

/** La tienda como `OnlineStore`: identidad, contacto y políticas. */
export function onlineStore(site: SiteContent, opts: { telephone: string | null }) {
  return {
    "@type": "OnlineStore",
    "@id": absoluteUrl("/#tienda"),
    name: site.brand.name,
    legalName: site.company.tradeName,
    url: absoluteUrl("/"),
    logo: absoluteUrl(site.brand.isotype?.src ?? site.brand.logo.color),
    image: absoluteUrl("/og/inicio.jpg"),
    description: site.brand.description,
    foundingDate: String(site.company.foundingYear),
    email: site.company.email,
    ...(opts.telephone ? { telephone: opts.telephone } : {}),
    address: { "@type": "PostalAddress", addressLocality: site.company.city, addressRegion: site.company.region, addressCountry: site.company.countryCode },
    areaServed: { "@type": "Country", name: site.company.country },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: site.company.email,
      ...(opts.telephone ? { telephone: opts.telephone } : {}),
      areaServed: site.company.countryCode,
      availableLanguage: ["es"],
    },
    sameAs: site.social.networks.map((n) => n.href),
    hasMerchantReturnPolicy: merchantReturnPolicy(site),
  };
}

/** "https://wa.me/573001234567?text=…" → "+573001234567". */
export function whatsappPhone(url: string | null): string | null {
  const n = url?.match(/wa\.me\/(\d+)/)?.[1];
  return n ? `+${n}` : null;
}
