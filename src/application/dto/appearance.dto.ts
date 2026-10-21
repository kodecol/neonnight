import { z } from "zod";
import { AA_LARGE, AA_TEXT, HEX_COLOR, contrastRatio } from "../lib/contrast";

/**
 * Apariencia de la tienda (marca blanca, fases 2 y 3): colores semánticos del
 * tema oscuro y tipografía de un catálogo cerrado. Contrato del futuro
 * `brand.config.json` (junto a `StoreIdentitySchema`).
 */

/** Fuentes disponibles (cargadas con next/font; nada de URLs arbitrarias). Archivo es la de hoy. */
export const FONT_KEYS = ["archivo", "inter", "manrope", "dm-sans", "space-grotesk", "montserrat", "playfair-display", "cormorant-garamond"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const FONT_LABELS: Record<FontKey, { label: string; kind: "sans" | "serif" }> = {
  archivo: { label: "Archivo", kind: "sans" },
  inter: { label: "Inter", kind: "sans" },
  manrope: { label: "Manrope", kind: "sans" },
  "dm-sans": { label: "DM Sans", kind: "sans" },
  "space-grotesk": { label: "Space Grotesk", kind: "sans" },
  montserrat: { label: "Montserrat", kind: "sans" },
  "playfair-display": { label: "Playfair Display", kind: "serif" },
  "cormorant-garamond": { label: "Cormorant Garamond", kind: "serif" },
};

const hex = z.string().trim().regex(HEX_COLOR, "Usa un color hex de 6 dígitos, por ejemplo #FF006E.").transform((v) => v.toLowerCase());

/** Tokens semánticos que se pueden cambiar (el resto se deriva: superficie elevada, vidrio, hover del acento…). */
export const ThemeColorsSchema = z.object({
  accent: hex,
  bg: hex,
  surface: hex,
  ink: hex,
  ink2: hex,
  ink3: hex,
  /** Líneas divisorias y bordes: se usan con transparencia (30 %, 40 % y 50 %). */
  divider: hex,
  border: hex,
});
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;

export const PRESETS = {
  "neon-night": { label: "Neon Night", colors: { accent: "#ff006e", bg: "#000000", surface: "#0e0e0e", ink: "#ffffff", ink2: "#a1a1a1", ink3: "#515151", divider: "#969696", border: "#969696" } },
  zafiro: { label: "Zafiro", colors: { accent: "#2f5bea", bg: "#05070d", surface: "#0d111c", ink: "#ffffff", ink2: "#a3abbd", ink3: "#4f566a", divider: "#8a93a8", border: "#8a93a8" } },
  esmeralda: { label: "Esmeralda", colors: { accent: "#0b7a54", bg: "#030806", surface: "#0b1310", ink: "#ffffff", ink2: "#a2b3ab", ink3: "#4c5a54", divider: "#8c9c95", border: "#8c9c95" } },
  oro: { label: "Oro", colors: { accent: "#9a6f12", bg: "#0a0805", surface: "#15110b", ink: "#ffffff", ink2: "#b8ad98", ink3: "#5c5547", divider: "#a0947c", border: "#a0947c" } },
} as const satisfies Record<string, { label: string; colors: ThemeColors }>;
export type PresetKey = keyof typeof PRESETS;
export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

export interface ContrastCheck {
  id: "ink-bg" | "ink2-bg" | "ink-surface" | "ink-accent";
  label: string;
  ratio: number;
  min: number;
  ok: boolean;
}

/** Comprobaciones WCAG AA del tema: texto sobre fondo y superficie, y texto sobre el acento (botones). */
export function contrastChecks(c: ThemeColors): ContrastCheck[] {
  const check = (id: ContrastCheck["id"], label: string, fg: string, bg: string, min: number) => {
    const ratio = contrastRatio(fg, bg);
    return { id, label, ratio: Math.round(ratio * 100) / 100, min, ok: ratio >= min };
  };
  return [
    check("ink-bg", "Texto sobre el fondo", c.ink, c.bg, AA_TEXT),
    check("ink2-bg", "Texto secundario sobre el fondo", c.ink2, c.bg, AA_TEXT),
    check("ink-surface", "Texto sobre las superficies", c.ink, c.surface, AA_TEXT),
    check("ink-accent", "Texto sobre el acento (botones)", c.ink, c.accent, AA_LARGE),
  ];
}

export const StoreAppearanceSchema = z
  .object({
    /** De qué preset parte; "personalizado" si se tocó algún color. */
    preset: z.enum(["neon-night", "zafiro", "esmeralda", "oro", "personalizado"]),
    colors: ThemeColorsSchema,
    fonts: z.object({
      /** Títulos (h1–h3). */
      display: z.enum(FONT_KEYS),
      /** Cuerpo, rótulos y botones. */
      body: z.enum(FONT_KEYS),
    }),
  })
  .superRefine((a, ctx) => {
    for (const c of contrastChecks(a.colors)) {
      if (!c.ok) ctx.addIssue({ code: "custom", path: ["colors", c.id], message: `${c.label}: contraste ${c.ratio.toFixed(2)}:1, el mínimo es ${c.min}:1 (WCAG AA).` });
    }
  });
export type StoreAppearanceInput = z.infer<typeof StoreAppearanceSchema>;

export const DEFAULT_APPEARANCE: StoreAppearanceInput = { preset: "neon-night", colors: { ...PRESETS["neon-night"].colors }, fonts: { display: "archivo", body: "archivo" } };
