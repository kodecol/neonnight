"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import type { IdentityAsset } from "@/application/dto/identity.dto";
import { useBodyLock } from "@/presentation/hooks/use-body-lock";
import { cn } from "@/presentation/lib/cn";
import { NAV_GROUPS, isActivePath } from "./admin-nav";

/**
 * Marco del panel: barra lateral fija en escritorio, agrupada por intención
 * (ver admin-nav.ts), y en móvil una barra superior con un menú a pantalla
 * completa con los mismos grupos. `logout` es una server action de la ruta.
 */
export function AdminShell({ wordmark, isotype, logout, children }: { wordmark: string; isotype?: IdentityAsset | null; logout: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useBodyLock(open);

  // Al navegar, el menú móvil se cierra.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = NAV_GROUPS.flatMap((g) => g.items).find((i) => isActivePath(pathname, i));

  return (
    <div className="min-h-screen bg-bg lg:pl-[248px]">
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-divider bg-bg lg:flex">
        <span className="h-[2px] w-full bg-accent" aria-hidden="true" />
        <Link href="/admin/catalogo" className="flex items-center gap-3.5 px-8 pb-10 pt-9">
          <Isotype size={30} asset={isotype} priority />
          <span className="flex flex-col">
            <span className="text-label uppercase tracking-[0.3em] text-ink">{wordmark}</span>
            <span className="mt-1 text-label-sm uppercase text-ink-3">Admin</span>
          </span>
        </Link>
        <PanelNav pathname={pathname} className="min-h-0 flex-1 overflow-y-auto" />
        <ShellFooter logout={logout} className="border-t border-divider px-8 py-7" />
      </aside>

      {/* Móvil / tablet */}
      <header className="backdrop-header sticky top-0 z-40 border-b border-divider bg-glass lg:hidden">
        <span className="block h-[2px] w-full bg-accent" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin/catalogo" className="flex items-center gap-3" aria-label="Inicio del panel">
            <Isotype size={24} asset={isotype} />
            <span className="text-label-sm uppercase tracking-[0.3em]">Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-menu"
            className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-label uppercase text-ink"
          >
            <span className="text-ink-2">{current?.label ?? "Menú"}</span>
            <span className="relative block h-3 w-4" aria-hidden="true">
              <span className={cn("absolute left-0 top-0.5 h-px w-4 bg-ink transition-transform duration-200", open && "translate-y-[5px] rotate-45")} />
              <span className={cn("absolute bottom-0.5 left-0 h-px w-4 bg-ink transition-transform duration-200", open && "-translate-y-[5px] -rotate-45")} />
            </span>
            <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          </button>
        </div>
      </header>
      {open && (
        <div id="admin-menu" className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-bg pt-24 lg:hidden" data-testid="admin-menu">
          <PanelNav pathname={pathname} />
          <ShellFooter logout={logout} className="mt-auto border-t border-divider px-8 py-7" />
        </div>
      )}

      <main className="px-5 pb-32 pt-10 md:px-10 lg:px-14 lg:pt-14">{children}</main>
    </div>
  );
}

function PanelNav({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <nav aria-label="Panel" className={cn("flex flex-col gap-8 pb-8", className)}>
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label} role="group" aria-labelledby={`nav-group-${gi}`}>
          <span id={`nav-group-${gi}`} className="flex items-baseline gap-3 px-8 pb-2 text-label-sm uppercase text-ink-3">
            <span aria-hidden="true">{String(gi + 1).padStart(2, "0")}</span>
            {group.label}
          </span>
          {group.items.map((item) => {
            const active = isActivePath(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex px-8 py-2.5 text-label-lg uppercase transition-colors duration-200",
                  active ? "text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <span className={cn("absolute inset-y-1.5 left-0 w-[2px] transition-colors", active ? "bg-accent" : "bg-transparent")} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function ShellFooter({ logout, className }: { logout: () => Promise<void>; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Link href="/" target="_blank" rel="noreferrer" className="py-2 text-label uppercase text-ink-2 transition-colors hover:text-ink">
        Ver tienda ↗
      </Link>
      <form action={logout}>
        <button type="submit" className="cursor-pointer py-2 text-label uppercase text-ink-2 transition-colors hover:text-accent">
          Salir
        </button>
      </form>
    </div>
  );
}

/** Cabecera de página del panel: kicker, título display y acciones. */
export function AdminPageHeader({ kicker, title, actions }: { kicker: string; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
      <div>
        <span className="block text-kicker uppercase text-ink-2">{kicker}</span>
        <h1 className="m-0 mt-3 text-h2-fluid uppercase">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
