import { Archivo, Cormorant_Garamond, DM_Sans, Inter, Manrope, Montserrat, Playfair_Display, Space_Grotesk } from "next/font/google";
import type { FontKey } from "@/application/dto/appearance.dto";

/**
 * Catálogo cerrado de fuentes (Ajustes › Apariencia). Cada una define su
 * variable CSS en <html>; el navegador solo descarga la que el tema usa.
 * Solo Archivo, la de fábrica, se precarga.
 */
const archivo = Archivo({ subsets: ["latin"], weight: ["200", "400", "500", "600"], display: "swap", variable: "--font-archivo" });
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter", preload: false });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-space-grotesk", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", variable: "--font-montserrat", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", variable: "--font-playfair-display", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600"], display: "swap", variable: "--font-cormorant-garamond", preload: false });

export const FONTS: Record<FontKey, { variable: string }> = {
  archivo,
  inter,
  manrope,
  "dm-sans": dmSans,
  "space-grotesk": spaceGrotesk,
  montserrat,
  "playfair-display": playfair,
  "cormorant-garamond": cormorant,
};

/** Clases con las variables de todas las fuentes (van en <html>). */
export const fontVariables = Object.values(FONTS)
  .map((f) => f.variable)
  .join(" ");
