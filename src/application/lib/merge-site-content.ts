import type { SiteContent } from "../dto/site-content.dto";
import type { HomeSettings } from "../ports/home-settings";
import { SOCIAL_NETWORKS } from "./social-networks";

/**
 * Aplica sobre el contenido del código lo que se editó en el panel › Inicio
 * (compromisos, testimonios y redes). Lo que nunca se editó (null) queda como
 * está, así que el sitio nunca pierde texto.
 */
export function mergeSiteContent(base: SiteContent, s: HomeSettings): SiteContent {
  const trust = s.trust
    ? {
        kicker: s.trust.kicker ?? base.home.trust.kicker,
        items: s.trust.items.map((it, i) => ({ number: String(i + 1).padStart(2, "0"), title: it.title, body: it.body, accent: i === s.trust!.items.length - 1 })),
      }
    : base.home.trust;

  const testimonials = s.testimonials
    ? {
        kicker: s.testimonials.kicker ?? base.home.testimonials.kicker,
        title: s.testimonials.title ?? base.home.testimonials.title,
        note: s.testimonials.note ?? base.home.testimonials.note,
        // Solo lo autorizado por el cliente y marcado como visible.
        items: s.testimonials.items.filter((t) => t.visible && t.authorized).map(({ quote, name, city, piece, rating }) => ({ quote, name, city, piece, rating })),
      }
    : base.home.testimonials;

  const social = s.social
    ? {
        kicker: s.social.kicker ?? base.social.kicker,
        title: s.social.title ?? base.social.title,
        body: s.social.body ?? base.social.body,
        networks: s.social.networks
          .filter((n) => n.enabled)
          .map((n) => ({ id: n.id, label: SOCIAL_NETWORKS[n.id].label, handle: n.handle, href: n.href, description: n.description, cta: SOCIAL_NETWORKS[n.id].cta })),
      }
    : base.social;

  return { ...base, home: { ...base.home, trust, testimonials }, social };
}
