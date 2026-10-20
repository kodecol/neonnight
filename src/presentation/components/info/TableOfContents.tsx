"use client";
import { useEffect, useState } from "react";
import { cn } from "@/presentation/lib/cn";

/** Índice lateral de las páginas legales: resalta la sección que se está leyendo. */
export function TableOfContents({ items, label }: { items: Array<{ id: string; title: string }>; label: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className="lg:sticky lg:top-[calc(var(--spacing-header)+32px)]">
      <span className="mb-4 block text-label uppercase text-ink-3">{label}</span>
      <ol className="m-0 flex list-none flex-col border-l border-divider p-0">
        {items.map((it, i) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-current={active === it.id ? "location" : undefined}
              className={cn(
                "-ml-px flex gap-3 border-l py-2 pl-4 text-small transition-colors",
                active === it.id ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              <span className="w-5 shrink-0 tabular-nums text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              {it.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
