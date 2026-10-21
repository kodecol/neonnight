import type { FontKey, StoreAppearanceInput } from "../dto/appearance.dto";
import { hexToRgb } from "./contrast";

const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
};

/** Variable CSS de cada fuente (la define next/font en <html>). */
export const fontVar = (key: FontKey) => `--font-${key}`;

/**
 * CSS que sobrescribe los tokens del tema en `:root`. Los valores vienen
 * validados (hex y claves de un catálogo cerrado), así que se pueden poner
 * en un <style> sin riesgo de inyección.
 */
export function themeCss(a: StoreAppearanceInput): string {
  const c = a.colors;
  const vars: Record<string, string> = {
    "--color-accent": c.accent,
    "--color-accent-hover": `color-mix(in srgb, ${c.accent} 90%, #000)`,
    "--color-accent-active": `color-mix(in srgb, ${c.accent} 80%, #000)`,
    "--color-bg": c.bg,
    "--color-surface": c.surface,
    "--color-surface-elevated": `color-mix(in srgb, ${c.surface} 70%, ${c.bg})`,
    "--color-ink": c.ink,
    "--color-ink-2": c.ink2,
    "--color-ink-3": c.ink3,
    "--color-divider": rgba(c.divider, 0.3),
    "--color-border": rgba(c.border, 0.4),
    "--color-border-strong": rgba(c.border, 0.5),
    "--color-scrim": rgba(c.bg, 0.5),
    "--color-glass": rgba(c.bg, 0.7),
    "--color-glass-deep": rgba(c.bg, 0.72),
    "--font-sans": `var(${fontVar(a.fonts.body)}), system-ui, sans-serif`,
    "--font-display": `var(${fontVar(a.fonts.display)}), system-ui, sans-serif`,
  };
  return `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}
