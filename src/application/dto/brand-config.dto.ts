import { z } from "zod";
import { hexToRgb, HEX_COLOR } from "../lib/contrast";
import { FONT_KEYS, PRESETS, type FontKey, type StoreAppearanceInput, type ThemeColors } from "./appearance.dto";
import type { CompanyInput } from "./legal.dto";
import type { StoreIdentityInput } from "./identity.dto";
import { isNetworkUrl } from "../lib/social-networks";
import type { SocialNetworkKey } from "../ports/home-settings";

/**
 * `brand.json` de la plantilla `jewelry-store`: lo que la plataforma Kodecol
 * (CLI `kode`) entrega al crear una instancia. `brand:apply` lo valida con este
 * esquema y escribe los valores en la base (Identidad, Apariencia, Legales y
 * redes), editables luego desde el panel. `brand.schema.json` se genera de aquí
 * (`npm run brand:schema`; un test exige que esté al día).
 * Claves en snake_case: es un archivo que escriben personas y otras herramientas.
 */

export const NICHES = ["relojeria", "joyeria", "perfumeria", "ecommerce"] as const;
export type Niche = (typeof NICHES)[number];

/** Slug de la instancia: claves de localStorage, carpetas de medios, nombre de la base. */
export const STORE_SLUG = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;

const hex = z.string().trim().regex(HEX_COLOR, "Color hex de 6 dígitos, p. ej. #FF006E.").transform((v) => v.toLowerCase());
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Debe ser una URL https.");
/** Imagen de marca: URL https (brand:apply la descarga) o un archivo del sitio (`/assets/…`). */
const assetRef = z.union([httpsUrl, z.string().regex(/^\/assets\/[\w./-]+\.(png|webp|avif|svg)$/, "Ruta del sitio no válida.")]);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const BrandConfigSchema = z
  .object({
    $schema: z.string().optional(),
    slug: z.string().regex(STORE_SLUG, "Minúsculas, números y guiones; empieza por letra; 3 a 32 caracteres."),
    name: text(2, 40).describe("Nombre comercial: títulos, metadatos y textos."),
    wordmark: text(2, 40).optional().describe("Cómo se escribe junto al isotipo. Por defecto, el nombre en mayúsculas."),
    tagline: text(10, 160).optional().describe("Frase corta del hero y el pie. Por defecto, una del nicho."),
    description: text(30, 200).optional().describe("Descripción para buscadores. Por defecto, una del nicho."),
    seo_title: text(3, 60).optional().describe("Lo que sigue al nombre en el título de la portada. Por defecto, uno del nicho."),
    niche: z.enum(NICHES),
    colors: z
      .object({
        accent: hex,
        background: hex,
        surface: hex.optional(),
        ink: hex.optional(),
        ink2: hex.optional(),
        ink3: hex.optional(),
        divider: hex.optional(),
        border: hex.optional(),
      })
      .describe("Tema oscuro. Mínimo acento y fondo; el resto se deriva. Se exige contraste WCAG AA."),
    font: z
      .union([z.enum(FONT_KEYS), z.object({ body: z.enum(FONT_KEYS), display: z.enum(FONT_KEYS) })])
      .default("archivo")
      .describe("Una fuente del catálogo para todo, o una para títulos y otra para el cuerpo."),
    logo_url: assetRef.optional().describe("Logo horizontal para fondo oscuro (SVG, PNG, WebP o AVIF transparente)."),
    isotipo_url: assetRef.optional().describe("Isotipo cuadrado para fondo oscuro: favicon, íconos y barra."),
    icons_dir: z
      .string()
      .regex(/^\/assets\/brands\/[a-z0-9-]+\/icons$/)
      .optional()
      .describe("Íconos hechos a mano dentro del sitio (favicon.ico, icon-512.png, apple-touch-icon.png). Sin él, se dibujan con el isotipo."),
    logo_light_url: assetRef.optional().describe("Isotipo o logo para fondo claro: el que muestran los buscadores. Sin él, el isotipo."),
    company: z.object({
      founding_year: z.number().int().min(1900).max(2100).optional().describe("Año de fundación (Nosotros y buscadores). Por defecto, el actual."),
      legal_name: text(2, 60).describe("Nombre del establecimiento o razón social, como figura en la matrícula."),
      tax_id: text(1, 20).describe("NIT o número de matrícula mercantil."),
      legal_form: text(2, 60).optional(),
      chamber: text(2, 80).optional().describe("Cámara de Comercio. Por defecto, la de la ciudad."),
      city: text(2, 60),
      region: text(2, 60).optional().describe("Departamento. Por defecto, la ciudad."),
      email: z.string().trim().email(),
      privacy_email: z.string().trim().email().optional(),
      whatsapp: z
        .string()
        .trim()
        .regex(/^\+?\d{10,15}$/, "Número con indicativo, solo dígitos (p. ej. 573001234567).")
        .optional()
        .describe("Kode lo pasa como WHATSAPP_NUMBER."),
      address: text(5, 160).optional().describe("Reservado: hoy no se muestra en el sitio."),
      hours: text(2, 120).optional(),
      carrier: text(2, 60).optional(),
      tracking_url: httpsUrl.optional(),
    }),
    social: z
      .object({ instagram: httpsUrl.optional(), facebook: httpsUrl.optional(), tiktok: httpsUrl.optional(), youtube: httpsUrl.optional() })
      .optional(),
    locale: z.literal("es-CO").default("es-CO"),
    currency: z.literal("COP").default("COP"),
  })
  .superRefine((b, ctx) => {
    for (const [id, href] of Object.entries(b.social ?? {})) {
      if (href && !isNetworkUrl(id as SocialNetworkKey, href)) ctx.addIssue({ code: "custom", path: ["social", id], message: `El enlace no es de ${id}.` });
    }
    if (luminance(b.colors.background) > 0.2) ctx.addIssue({ code: "custom", path: ["colors", "background"], message: "Por ahora la plantilla solo tiene tema oscuro: el fondo debe ser oscuro." });
  });
export type BrandConfig = z.infer<typeof BrandConfigSchema>;
export type BrandConfigInput = z.input<typeof BrandConfigSchema>;

function luminance(h: string): number {
  const [r, g, b] = hexToRgb(h).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const mix = (a: string, b: string, t: number) => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
};

/** Completa la paleta a partir de acento y fondo (lo explícito manda). */
export function brandColors(c: BrandConfig["colors"]): ThemeColors {
  const base = PRESETS["neon-night"].colors;
  const ink = c.ink ?? base.ink;
  return {
    accent: c.accent,
    bg: c.background,
    surface: c.surface ?? mix(c.background, "#ffffff", 0.055),
    ink,
    ink2: c.ink2 ?? mix(c.background, ink, 0.63),
    ink3: c.ink3 ?? mix(c.background, ink, 0.32),
    divider: c.divider ?? mix(c.background, ink, 0.59),
    border: c.border ?? mix(c.background, ink, 0.59),
  };
}

const NICHE_COPY: Record<Niche, { title: string; tagline: string; description: string }> = {
  relojeria: {
    title: "Relojes nuevos y verificados",
    tagline: "Relojes seleccionados uno por uno, con garantía y envío asegurado.",
    description: "Relojes nuevos y auténticos en Colombia, revisados antes de publicarlos, con garantía, envío asegurado y asesoría por WhatsApp.",
  },
  joyeria: {
    title: "Joyas en oro, plata y piedras",
    tagline: "Joyas para todos los días y para las fechas que importan.",
    description: "Joyería en oro, plata y piedras en Colombia, con certificado, garantía, envío asegurado y asesoría por WhatsApp.",
  },
  perfumeria: {
    title: "Perfumes originales",
    tagline: "Perfumes originales, sellados y con envío asegurado.",
    description: "Perfumes originales en Colombia, en sus presentaciones de siempre, con envío asegurado y asesoría por WhatsApp.",
  },
  ecommerce: {
    title: "Relojes, joyas y perfumes verificados",
    tagline: "Relojes, joyas y perfumes seleccionados, con garantía y envío asegurado.",
    description: "Relojes, joyas y perfumes auténticos en Colombia, revisados antes de publicarlos, con garantía, envío asegurado y asesoría por WhatsApp.",
  },
};

/** Identidad para Ajustes › Identidad (isotipo y logo los resuelve quien sube las imágenes). */
export function brandIdentity(b: BrandConfig, assets: { isotype: StoreIdentityInput["isotype"]; logo: StoreIdentityInput["logo"]; lightLogo?: StoreIdentityInput["lightLogo"] }): StoreIdentityInput {
  const copy = NICHE_COPY[b.niche];
  return { name: b.name, wordmark: b.wordmark ?? b.name.toUpperCase(), tagline: b.tagline ?? copy.tagline, titleSuffix: b.seo_title ?? copy.title, description: b.description ?? copy.description, ...assets, ...(b.icons_dir ? { iconSet: b.icons_dir } : {}) };
}

export function brandAppearance(b: BrandConfig): StoreAppearanceInput {
  const fonts: { body: FontKey; display: FontKey } = typeof b.font === "string" ? { body: b.font, display: b.font } : b.font;
  return { preset: "personalizado", colors: brandColors(b.colors), fonts };
}

export function brandCompany(b: BrandConfig): CompanyInput {
  const c = b.company;
  return {
    tradeName: c.legal_name,
    legalForm: c.legal_form ?? "Establecimiento de comercio",
    registryNumber: c.tax_id,
    chamber: c.chamber ?? `Cámara de Comercio de ${c.city}`,
    ownerName: null,
    ownerTaxId: null,
    city: c.city,
    region: c.region ?? c.city,
    email: c.email,
    privacyEmail: c.privacy_email ?? c.email,
    hours: c.hours ?? "Lunes a sábado, de 9:00 a. m. a 6:00 p. m. (hora de Colombia)",
    carrier: c.carrier ?? "Interrapidísimo",
    trackingUrl: c.tracking_url ?? "https://www.interrapidisimo.com/",
    foundingYear: c.founding_year ?? null,
  };
}
