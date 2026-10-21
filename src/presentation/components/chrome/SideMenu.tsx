"use client";
import Link from "next/link";
import { useRef } from "react";
import { useBodyLock } from "@/presentation/hooks/use-body-lock";
import { useDialogFocus } from "@/presentation/hooks/use-dialog-focus";
import type { SiteContent } from "@/application/dto/site-content.dto";

export function SideMenu({
  open,
  onClose,
  whatsappUrl,
  instagramUrl,
  content,
}: {
  open: boolean;
  onClose: () => void;
  whatsappUrl: string | null;
  instagramUrl: string;
  content: SiteContent["navigation"];
}) {
  const panelRef = useRef<HTMLElement>(null);
  useBodyLock(open);

  useDialogFocus(open, panelRef, onClose);

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
          {content.menu.map((l) => (
            <Link key={l.label} href={l.href} onClick={onClose} className="text-menu uppercase hover:text-accent">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3.5 text-small text-ink-2">
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              {content.menuFooter.whatsappLabel}
            </a>
          ) : (
            <span className="text-ink-3">{content.menuFooter.whatsappLabel} (próximamente)</span>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              {content.menuFooter.instagramLabel}
            </a>
          )}
          <span className="my-2.5 h-px bg-divider" />
          <span className="text-legal text-ink-3">{content.menuFooter.note}</span>
        </div>
      </nav>
    </div>
  );
}
