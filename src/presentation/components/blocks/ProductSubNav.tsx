"use client";
import { useEffect, useState } from "react";
import { cn } from "@/presentation/lib/cn";

const TABS = [
  { id: "pieza", label: "La pieza" },
  { id: "detalles", label: "Detalles" },
  { id: "especificaciones", label: "Especificaciones" },
  { id: "compra", label: "Compra" },
];

export function ProductSubNav() {
  const [active, setActive] = useState("pieza");

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    TABS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Secciones del producto"
      className="backdrop-glass sticky top-header z-40 flex h-[60px] items-center gap-6 overflow-x-auto border-b border-divider bg-glass px-page text-label uppercase md:gap-10"
    >
      {TABS.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          aria-current={active === t.id ? "location" : undefined}
          className={cn("flex h-full shrink-0 items-center border-b-2 transition-colors", active === t.id ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink")}
        >
          {t.label}
        </a>
      ))}
    </nav>
  );
}
