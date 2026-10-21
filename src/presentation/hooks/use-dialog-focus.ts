"use client";
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href]:not([aria-disabled="true"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Foco de un diálogo modal (bolsa, menú): al abrir enfoca el primer control,
 * Tab y Shift+Tab no salen del panel, Escape cierra (si se pasa `onClose`) y
 * al cerrar el foco vuelve al control que lo abrió.
 */
export function useDialogFocus(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose?: () => void): void {
  // En una ref: un `onClose` nuevo en cada render no debe volver a enfocar el primer control.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const focusables = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current?.();
      if (e.key !== "Tab") return;
      const list = focusables();
      const first = list[0];
      const last = list.at(-1);
      if (!first || !last) return;
      const inside = panelRef.current?.contains(document.activeElement) ?? false;
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open, panelRef]);
}
