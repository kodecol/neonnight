"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ARMED = "nn-armed";
const IN = "nn-in";

/**
 * Animación de entrada como mejora progresiva. El contenido parte visible;
 * solo se oculta cuando <html> lleva .nn-armed (añadida aquí, tras montar),
 * con un fallback que lo destapa a los 1,4s y al ocultar la pestaña.
 */
export function useReveal(): void {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduced || document.hidden) return;

    const unGate = () => {
      root.classList.remove(ARMED);
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => el.classList.add(IN));
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add(IN);
            io.unobserve(en.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );

    root.classList.add(ARMED);
    const observeAll = () => document.querySelectorAll<HTMLElement>(`[data-reveal]:not(.${IN})`).forEach((el) => io.observe(el));
    observeAll();
    const raf = requestAnimationFrame(observeAll);

    const fallback = window.setTimeout(() => {
      if (!document.querySelector(`[data-reveal].${IN}`)) unGate();
    }, 1400);
    const onVis = () => {
      if (document.hidden) unGate();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      root.classList.remove(ARMED);
    };
  }, [pathname]);
}
