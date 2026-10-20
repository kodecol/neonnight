import type { SocialNetworkKey } from "../ports/home-settings";

/** Redes que la tienda sabe mostrar: nombre, acción y dominios válidos para el enlace. */
export const SOCIAL_NETWORKS: Record<SocialNetworkKey, { label: string; cta: string; hosts: readonly string[] }> = {
  instagram: { label: "Instagram", cta: "Seguir", hosts: ["instagram.com"] },
  facebook: { label: "Facebook", cta: "Seguir", hosts: ["facebook.com", "fb.com"] },
  tiktok: { label: "TikTok", cta: "Seguir", hosts: ["tiktok.com"] },
  youtube: { label: "YouTube", cta: "Suscribirse", hosts: ["youtube.com", "youtu.be"] },
};

export const SOCIAL_KEYS = Object.keys(SOCIAL_NETWORKS) as SocialNetworkKey[];

/** El enlace es https y del dominio de esa red (o un subdominio, como www.). */
export function isNetworkUrl(id: SocialNetworkKey, href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && SOCIAL_NETWORKS[id].hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
