"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { CONSENT_EVENT, readConsent, type Consent } from "@/presentation/analytics/consent";
import { disableGa, disablePixel, flushPending, loadGa, loadPixel, pixelPageView, track } from "@/presentation/analytics/track";

/**
 * Carga Google Analytics y el píxel de Meta solo con consentimiento, los
 * apaga si se retira y registra los clics a WhatsApp de todo el sitio.
 * Los IDs llegan del servidor ya validados (variables de entorno en runtime).
 */
export function Tracking({ gaId, pixelId }: { gaId: string | null; pixelId: string | null }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const firstView = useRef(true);

  useEffect(() => {
    const apply = (c: Consent | null) => {
      if (gaId) {
        if (c?.analytics) loadGa(gaId, c.marketing);
        else if ("gtag" in window) disableGa(gaId);
      }
      if (pixelId) {
        if (c?.marketing) loadPixel(pixelId);
        else disablePixel();
      }
      if (c && (c.analytics || c.marketing)) flushPending();
    };
    apply(readConsent());
    const onConsent = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [gaId, pixelId]);

  // GA4 cuenta los cambios de ruta solo (medición mejorada); el píxel necesita su PageView.
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    pixelPageView();
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) track({ name: "contact", channel: "whatsapp", location: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
