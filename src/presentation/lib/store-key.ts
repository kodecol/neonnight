/**
 * Clave de almacenamiento del navegador con el slug de la tienda (lo pone el
 * layout raíz en `<html data-store>`): dos tiendas en el mismo dominio de
 * pruebas no se pisan la bolsa ni el consentimiento. Se resuelve al usarla,
 * nunca al cargar el módulo (en el servidor no hay document).
 */
export function storeKey(key: string): string {
  const slug = typeof document === "undefined" ? "" : (document.documentElement.dataset.store ?? "");
  return `${slug || "tienda"}.${key}`;
}
