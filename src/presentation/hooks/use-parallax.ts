"use client";
import { useEffect } from "react";

/**
 * Un único listener de scroll pasivo + requestAnimationFrame recorre los
 * elementos [data-parallax], descarta los que están a más de 400px del
 * viewport y aplica translate3d(0, (centroElemento - centroViewport) * factor, 0).
 * Desactivado bajo prefers-reduced-motion y en móvil (< 768px).
 */
export function useParallax(): void {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 768px)");
    let raf = 0;

    const reset = () => {
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        el.style.transform = "";
      });
    };

    const apply = () => {
      raf = 0;
      if (reduced.matches || !desktop.matches) return;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -400 || r.top > vh + 400) return;
        const factor = parseFloat(el.dataset.parallax ?? "0") || 0;
        const offset = (r.top + r.height / 2 - vh / 2) * factor;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    const onChange = () => {
      reset();
      schedule();
    };

    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", onChange);
    desktop.addEventListener("change", onChange);
    schedule();

    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", onChange);
      desktop.removeEventListener("change", onChange);
      if (raf) cancelAnimationFrame(raf);
      reset();
    };
  }, []);
}
