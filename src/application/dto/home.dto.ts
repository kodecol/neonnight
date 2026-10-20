import { z } from "zod";
import type { SiteMediaKind } from "../ports/site-media";
import type { HeroMediaDto, ImageDto } from "./product.dto";

/** Un medio de la biblioteca del sitio tal como lo ve el panel. */
export interface SiteMediaDto {
  id: string;
  kind: SiteMediaKind;
  src: string;
  alt: string;
  width: number;
  height: number;
  poster: string | null;
  /** Dónde se usa ("Hero", "Banda"); vacío si está libre. */
  usedIn: string[];
}

/** Encuadres para recortar la foto de la banda (object-position). */
export const BAND_POSITIONS = {
  arriba: "50% 22%",
  centro: "50% 50%",
  abajo: "50% 78%",
} as const;
export type BandPosition = keyof typeof BAND_POSITIONS;

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

/** Formulario de la página de inicio en el panel. */
export const HomeSettingsInputSchema = z
  .object({
    hero: z.object({
      source: z.enum(["featured", "media"]),
      mediaId: z.string().nullable(),
      kicker: optional(60),
      title: optional(60),
      text: optional(220),
      ctaLabel: optional(40),
      ctaHref: optional(200).refine((v) => v === null || /^\/(?!\/)[\w\-./?=&#%]*$/.test(v), "Usa una ruta del sitio, por ejemplo /coleccion/relojeria."),
    }),
    band: z.object({
      mediaId: z.string().nullable(),
      title: optional(90),
      position: z.enum(Object.keys(BAND_POSITIONS) as [BandPosition, ...BandPosition[]]),
    }),
  })
  .superRefine((s, ctx) => {
    if (s.hero.source !== "media") return;
    if (!s.hero.mediaId) ctx.addIssue({ code: "custom", path: ["hero", "mediaId"], message: "Elige una foto o un video para el hero." });
    if (!s.hero.title) ctx.addIssue({ code: "custom", path: ["hero", "title"], message: "Escribe el título del hero." });
    if (s.hero.ctaLabel && !s.hero.ctaHref) ctx.addIssue({ code: "custom", path: ["hero", "ctaHref"], message: "El botón necesita un enlace." });
  });
export type HomeSettingsInput = z.infer<typeof HomeSettingsInputSchema>;

/** Lo que la home pinta cuando el contenido viene del panel. */
export interface HomeHeroDto {
  media: HeroMediaDto;
  kicker: string;
  title: string;
  text: string | null;
  cta: { label: string; href: string } | null;
}

export interface HomeContentDto {
  /** null: el hero sigue a la pieza destacada del catálogo. */
  hero: HomeHeroDto | null;
  /** null: se usa la banda por defecto. */
  band: { image: ImageDto & { position?: string }; title: string | null } | null;
}

export const SiteMediaAltSchema = z.object({ id: z.string().min(1), alt: z.string().trim().max(160) });

export const RegisterVideoSchema = z.object({
  src: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
