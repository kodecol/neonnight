import type { StoreAppearanceInput } from "@/application/dto/appearance.dto";
import { themeCss } from "@/application/lib/theme-css";

/**
 * Tema de Ajustes › Apariencia: sobrescribe los tokens de color y fuente en
 * :root. Sin apariencia publicada no se pinta nada (rige globals.css).
 * Los valores vienen validados (hex y claves de catálogo).
 */
export function ThemeStyle({ appearance }: { appearance: StoreAppearanceInput | null }) {
  if (!appearance) return null;
  return <style data-theme="tienda" dangerouslySetInnerHTML={{ __html: themeCss(appearance) }} />;
}
