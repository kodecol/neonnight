"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/presentation/lib/cn";

/**
 * `<details>` nativo (funciona sin JS) con mejoras: se cierra con Escape, al
 * hacer clic fuera y, si `closeOnNavigate`, al cambiar la URL.
 */
export function Disclosure({
  summary,
  children,
  closeOnNavigate = false,
  className,
  summaryClassName,
  testId,
}: {
  summary: ReactNode;
  children: ReactNode;
  closeOnNavigate?: boolean;
  className?: string;
  summaryClassName?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (closeOnNavigate && ref.current) ref.current.open = false;
  }, [pathname, search, closeOnNavigate]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={cn("group/disclosure", className)} data-testid={testId}>
      <summary className={cn("flex cursor-pointer list-none items-center gap-2.5 select-none [&::-webkit-details-marker]:hidden", summaryClassName)}>
        {summary}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="transition-transform duration-300 group-open/disclosure:rotate-180">
          <polyline points="1.5,3.5 5,7 8.5,3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </summary>
      {children}
    </details>
  );
}
