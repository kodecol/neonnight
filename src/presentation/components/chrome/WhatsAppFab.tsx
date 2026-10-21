"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/presentation/lib/cn";

/**
 * Asesoría por WhatsApp fija en la esquina inferior derecha, discreta y con el
 * lenguaje del sitio (cuadrada, negra, acento al pasar). En una ficha de
 * producto el mensaje lleva esa pieza (ver `WhatsAppMessage`).
 */
const OverrideContext = createContext<((href: string | null) => void) | null>(null);

export function WhatsAppProvider({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const [override, setOverride] = useState<string | null>(null);
  const target = override ?? href;
  return (
    <OverrideContext.Provider value={setOverride}>
      {children}
      {target && (
        <a
          href={target}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          data-testid="whatsapp-fab"
          className={cn(
            "group fixed bottom-5 right-5 z-[55] flex h-14 items-center border border-border-strong bg-glass-deep text-ink backdrop-blur-md transition-colors duration-300 hover:border-accent md:bottom-7 md:right-7",
            "[html[data-consent-open]_&]:hidden",
            // Con el panel de filtros abierto taparía sus opciones.
            "[html:has([data-testid=filter-panel][open])_&]:hidden",
          )}
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-label uppercase transition-[max-width,padding] duration-500 ease-[var(--ease-reveal)] group-hover:max-w-[220px] group-hover:pl-5 group-focus-visible:max-w-[220px] group-focus-visible:pl-5">
            {label}
          </span>
          <span className="flex h-14 w-14 items-center justify-center">
            <WhatsAppGlyph className="h-6 w-6 transition-colors group-hover:text-accent" />
          </span>
        </a>
      )}
    </OverrideContext.Provider>
  );
}

/** Cambia el mensaje del botón mientras la página esté montada (ficha de producto). */
export function WhatsAppMessage({ href }: { href: string | null }) {
  const set = useContext(OverrideContext);
  useEffect(() => {
    if (!set || !href) return;
    set(href);
    return () => set(null);
  }, [set, href]);
  return null;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3.5 20.5l1.3-4.3A8.6 8.6 0 1 1 8 19.4z" />
      <path d="M9.1 8.4c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.7l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.5.8-.5.3-1.2.5-2 .3-2.6-.7-4.6-2.7-5.3-5.3-.2-.8 0-1.5.3-2z" />
    </svg>
  );
}
