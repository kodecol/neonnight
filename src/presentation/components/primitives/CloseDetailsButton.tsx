"use client";
import type { ReactNode } from "react";

/** Cierra el `<details>` que lo contiene (p. ej. "Ver resultados" en el panel de filtros). */
export function CloseDetailsButton({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <button
      type="button"
      className={className}
      data-testid={testId}
      onClick={(e) => {
        const details = e.currentTarget.closest("details");
        if (details) {
          details.open = false;
          details.querySelector("summary")?.focus();
        }
      }}
    >
      {children}
    </button>
  );
}
