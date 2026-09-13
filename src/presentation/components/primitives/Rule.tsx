import { cn } from "@/presentation/lib/cn";

export function Rule({ className }: { className?: string }) {
  return <hr className={cn("m-0 h-px border-0 bg-divider", className)} />;
}
