"use client";
import { cn } from "@/presentation/lib/cn";

/** Selector de cantidad cuadrado: − valor +. Los botones se desactivan en los topes. */
export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const btn = cn(
    "flex cursor-pointer items-center justify-center border-0 bg-transparent text-ink transition-colors hover:text-accent disabled:cursor-not-allowed disabled:text-ink-3",
    size === "sm" ? "h-8 w-8" : "h-[58px] w-12",
  );
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center border border-border", size === "sm" ? "h-8" : "h-[58px]")}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Quitar una unidad">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      <output aria-live="polite" className={cn("min-w-7 text-center tabular-nums", size === "sm" ? "text-legal" : "text-meta font-normal")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Añadir una unidad">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
    </div>
  );
}
