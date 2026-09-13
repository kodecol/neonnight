import type { ReactNode } from "react";
import { cn } from "@/presentation/lib/cn";

export function Kicker({ children, tone = "muted", className, as: Tag = "span" }: { children: ReactNode; tone?: "muted" | "ink" | "faint"; className?: string; as?: "span" | "p" }) {
  const color = tone === "ink" ? "text-ink" : tone === "faint" ? "text-ink-3" : "text-ink-2";
  return <Tag className={cn("block text-kicker uppercase", color, className)}>{children}</Tag>;
}
