import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/presentation/lib/cn";

export function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-block border px-[22px] py-3 text-label uppercase tracking-[0.14em] transition-colors",
        active ? "border-ink text-ink" : "border-border text-ink-2 hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
