import { cn } from "@/presentation/lib/cn";

export function Price({ formatted, className }: { formatted: string; className?: string }) {
  return <span className={cn("text-meta font-normal text-ink", className)}>{formatted}</span>;
}
