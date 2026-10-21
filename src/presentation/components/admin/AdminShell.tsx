"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import { cn } from "@/presentation/lib/cn";

const NAV = [
  { n: "01", href: "/admin/catalogo", label: "Catálogo" },
  { n: "02", href: "/admin/marcas", label: "Marcas" },
  { n: "03", href: "/admin/pedidos", label: "Pedidos" },
  { n: "04", href: "/admin/inicio", label: "Inicio" },
  { n: "05", href: "/admin/legales", label: "Legales" },
  { n: "06", href: "/admin/pagos", label: "Pagos" },
  { n: "07", href: "/admin/cuenta", label: "Cuenta" },
] as const;

/**
 * Marco del panel: barra lateral fija en escritorio y barra superior en móvil.
 * `logout` es una server action que recibe desde la ruta.
 */
export function AdminShell({ wordmark, logout, children }: { wordmark: string; logout: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-bg lg:pl-[248px]">
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-divider bg-bg lg:flex">
        <span className="h-[2px] w-full bg-accent" aria-hidden="true" />
        <Link href="/admin/catalogo" className="flex items-center gap-3.5 px-8 pb-12 pt-9">
          <Isotype size={30} priority />
          <span className="flex flex-col">
            <span className="text-label uppercase tracking-[0.3em] text-ink">{wordmark}</span>
            <span className="mt-1 text-label-sm uppercase text-ink-3">Admin</span>
          </span>
        </Link>
        <nav aria-label="Panel" className="flex flex-col">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-baseline gap-4 px-8 py-4 text-label-lg uppercase transition-colors duration-200",
                  active ? "text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <span className={cn("absolute inset-y-2 left-0 w-[2px] transition-colors", active ? "bg-accent" : "bg-transparent")} aria-hidden="true" />
                <span className="text-label-sm text-ink-3">{item.n}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-divider px-8 py-7">
          <Link href="/" target="_blank" rel="noreferrer" className="py-2 text-label uppercase text-ink-2 transition-colors hover:text-ink">
            Ver tienda ↗
          </Link>
          <form action={logout}>
            <button type="submit" className="cursor-pointer py-2 text-label uppercase text-ink-2 transition-colors hover:text-accent">
              Salir
            </button>
          </form>
        </div>
      </aside>

      {/* Móvil / tablet */}
      <header className="backdrop-header sticky top-0 z-40 border-b border-divider bg-glass lg:hidden">
        <span className="block h-[2px] w-full bg-accent" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin/catalogo" className="flex items-center gap-3" aria-label="Inicio del panel">
            <Isotype size={24} />
            <span className="text-label-sm uppercase tracking-[0.3em]">Admin</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="cursor-pointer text-label-sm uppercase text-ink-2 hover:text-accent">
              Salir
            </button>
          </form>
        </div>
        <nav aria-label="Panel" className="flex border-t border-divider">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex-1 border-b-2 py-3.5 text-center text-label uppercase transition-colors",
                  active ? "border-accent text-ink" : "border-transparent text-ink-2",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-5 pb-32 pt-10 md:px-10 lg:px-14 lg:pt-14">{children}</main>
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
