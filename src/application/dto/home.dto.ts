import { z } from "zod";
import { SOCIAL_KEYS, isNetworkUrl } from "../lib/social-networks";
import type { SiteMediaKind } from "../ports/site-media";
import { HOME_BLOCK_IDS, type HomeBlockId, type HomeLayout } from "../ports/home-settings";
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

const required = (min: number, max: number, msg = "Obligatorio.") => z.string().trim().min(min, msg).max(max);

export const TrustInputSchema = z.object({
  kicker: optional(40),
  items: z
    .array(z.object({ title: required(1, 40), body: required(1, 220) }))
    .length(3, "Son tres compromisos."),
});

export const TestimonialInputSchema = z.object({
  id: z.string().min(1).max(40),
  quote: required(20, 400, "Escribe el testimonio (mínimo 20 caracteres)."),
  name: required(2, 40),
  city: required(2, 40),
  piece: required(2, 60),
  rating: z.number().int().min(1).max(5),
  authorized: z.boolean(),
  visible: z.boolean(),
});

export const TestimonialsInputSchema = z.object({
  kicker: optional(40),
  title: optional(90),
  note: optional(90),
  items: z.array(TestimonialInputSchema).max(12, "Máximo 12 testimonios."),
});

export const SocialInputSchema = z
  .object({
    kicker: optional(40),
    title: optional(90),
    body: optional(220),
    networks: z.array(
      z.object({
        id: z.enum(SOCIAL_KEYS as [(typeof SOCIAL_KEYS)[number], ...(typeof SOCIAL_KEYS)[number][]]),
        enabled: z.boolean(),
        handle: z.string().trim().max(40),
        href: z.string().trim().max(200),
        description: z.string().trim().max(90),
      }),
    ),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.networks.map((n) => n.id)).size !== s.networks.length) ctx.addIssue({ code: "custom", path: ["networks"], message: "Red repetida." });
    s.networks.forEach((n, i) => {
      if (!n.enabled) return;
      if (!isNetworkUrl(n.id, n.href)) ctx.addIssue({ code: "custom", path: ["networks", i, "href"], message: "Pega el enlace https del perfil en esa red." });
      if (!n.handle) ctx.addIssue({ code: "custom", path: ["networks", i, "handle"], message: "Obligatorio." });
    });
  });

/** Formulario de la página de inicio en el panel. Los bloques en null no se tocan (siguen los textos del código). */
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
    trust: TrustInputSchema.nullable(),
    testimonials: TestimonialsInputSchema.nullable(),
    social: SocialInputSchema.nullable(),
    /** Orden y visibilidad de los bloques; null: el orden de siempre. */
    layout: z
      .array(z.object({ id: z.enum(HOME_BLOCK_IDS as [HomeBlockId, ...HomeBlockId[]]), visible: z.boolean() }))
      .max(HOME_BLOCK_IDS.length)
      .nullable(),
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
  /** Orden completo de los bloques y cuáles se ven. */
  layout: HomeLayout;
}

export const SiteMediaAltSchema = z.object({ id: z.string().min(1), alt: z.string().trim().max(160) });

export const RegisterVideoSchema = z.object({
  src: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** Lo que el editor muestra de cada bloque: lo guardado o, si nunca se editó, el contenido actual del código. */
export interface HomeEditorDefaults {
  trust: NonNullable<HomeSettingsInput["trust"]>;
  testimonials: NonNullable<HomeSettingsInput["testimonials"]>;
  social: NonNullable<HomeSettingsInput["social"]>;
}
