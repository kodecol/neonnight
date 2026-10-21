/**
 * Mapa del panel. La barra lateral agrupa las secciones por intención
 * (operar la tienda, editar el sitio, configurar) y todo lo que se configura
 * una vez vive en un solo módulo, Ajustes, con pestañas: así el menú no crece
 * con cada ajuste nuevo. Para sumar un ajuste, se agrega una pestaña aquí y una
 * página en src/app/admin/(panel)/ajustes/<slug>/.
 */
export interface NavItem {
  href: string;
  label: string;
  /** Rutas que también marcan el ítem como activo (p. ej. las pestañas de Ajustes). */
  match?: string;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const SETTINGS_TABS: readonly NavItem[] = [
  { href: "/admin/ajustes/identidad", label: "Identidad" },
  { href: "/admin/ajustes/pagos", label: "Pagos" },
  { href: "/admin/ajustes/seguridad", label: "Seguridad" },
];

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/catalogo", label: "Catálogo" },
      { href: "/admin/marcas", label: "Marcas" },
    ],
  },
  {
    label: "Sitio",
    items: [
      { href: "/admin/inicio", label: "Inicio" },
      { href: "/admin/legales", label: "Legales" },
    ],
  },
  {
    label: "Configuración",
    items: [{ href: SETTINGS_TABS[0]!.href, label: "Ajustes", match: "/admin/ajustes" }],
  },
];

export function isActivePath(pathname: string, item: NavItem): boolean {
  const base = item.match ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}
