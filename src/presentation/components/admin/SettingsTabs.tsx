"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/presentation/lib/cn";
import { SETTINGS_TABS, isActivePath } from "./admin-nav";

/** Pestañas del módulo Ajustes: una ruta por pestaña (enlazables y con historial). */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ajustes" className="-mx-5 mb-12 overflow-x-auto border-b border-divider px-5 md:mx-0 md:px-0">
      <ul className="m-0 flex list-none gap-8 p-0">
        {SETTINGS_TABS.map((tab) => {
          const active = isActivePath(pathname, tab);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block whitespace-nowrap border-b-2 pb-4 text-label-lg uppercase transition-colors duration-200",
                  active ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
