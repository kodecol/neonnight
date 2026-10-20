"use client";
import { useEffect, useRef } from "react";

/**
 * Marcador invisible: al montar, desplaza en horizontal su contenedor con
 * scroll para que el elemento `aria-current` quede a la vista (pestañas en móvil).
 */
export function ActiveIntoView() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const scroller = ref.current?.parentElement;
    const active = scroller?.querySelector<HTMLElement>("[aria-current=page]");
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
  }, []);
  return <span ref={ref} hidden />;
}
