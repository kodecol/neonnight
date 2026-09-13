"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useBodyLock } from "@/presentation/hooks/use-body-lock";
import { ROUTES } from "@/presentation/lib/site";

const LINKS = [
  { href: ROUTES.collection, label: "Colección" },
  { href: `${ROUTES.collection}?orden=novedades`, label: "Novedades" },
  { href: "/#autenticidad", label: "Autenticidad" },
  { href: "/#showroom", label: "Showroom" },
];

export function SideMenu({ open, onClose, whatsappUrl, instagramUrl }: { open: boolean; onClose: () => void; whatsappUrl: string | null; instagramUrl: string }) {
  const panelRef = useRef<HTMLElement>(null);
  useBodyLock(open);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        const list = Array.from(focusables);
        const firstEl = list[0];
        const lastEl = list[list.length - 1];
        if (!firstEl || !lastEl) return;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="backdrop-glass fixed inset-0 z-[60] bg-scrim" onClick={onClose} data-testid="side-menu-overlay">
      <nav
        id="site-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[640px] flex-col justify-between border-r border-divider bg-glass-deep px-page pb-12 pt-[112px] md:w-[41.7vw]"
      >
        <div className="flex flex-col gap-[18px]">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={onClose} className="text-menu uppercase hover:text-accent">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3.5 text-small text-ink-2">
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              Asesoría por WhatsApp
            </a>
          ) : (
            <span className="text-ink-3">Asesoría por WhatsApp (próximamente)</span>
          )}
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            Instagram
          </a>
          <span className="my-2.5 h-px bg-divider" />
          <span className="text-legal text-ink-3">Envíos asegurados en Colombia · Pago contra verificación</span>
        </div>
      </nav>
    </div>
  );
}
