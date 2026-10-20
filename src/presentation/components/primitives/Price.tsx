import { cn } from "@/presentation/lib/cn";

export function Price({ formatted, from = false, className }: { formatted: string; from?: boolean; className?: string }) {
  return (
    <span className={cn("text-meta font-normal text-ink", className)}>
      {from && <span className="text-ink-2">Desde </span>}
      {formatted}
    </span>
  );
}
