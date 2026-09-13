"use client";
import { useEffect, useState } from "react";
import { Isotype } from "@/presentation/components/primitives/Isotype";

const SESSION_KEY = "neonnight.loaded";
const TOTAL_MS = 1700 + 500;

/**
 * Overlay decorativo sobre el HTML completo: no retrasa el LCP ni oculta
 * contenido a los rastreadores. Se desmonta del DOM al terminar, no se
 * renderiza bajo prefers-reduced-motion y solo aparece una vez por sesión.
 */
export function LoadingScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* sin sessionStorage: mostrar igual */
    }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), TOTAL_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="nn-loader fixed inset-0 z-[9999] flex items-center justify-center bg-bg" aria-hidden="true" data-testid="loading-screen">
      <div className="nn-loader-bar absolute left-0 top-0 h-[3px] bg-ink" />
      <div className="flex flex-col items-center gap-[22px]">
        <Isotype size={64} className="opacity-90" priority />
        <div className="nn-loader-mark text-label-lg uppercase tracking-[0.34em] text-ink">NEON NIGHT</div>
      </div>
    </div>
  );
}
