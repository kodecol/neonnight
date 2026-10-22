import { createHmac, hkdfSync } from "node:crypto";
import { join } from "node:path";
import { STORE_SLUG } from "@/application/dto/brand-config.dto";
import { trackingIds, type TrackingIds } from "@/application/lib/tracking-ids";

/**
 * Configuración de UNA tienda: lo que en modo `single` sale del entorno y en
 * modo `multi` (demo host) sale del tenant de la petición. Todo lo que antes
 * se leía de `process.env` por instancia pasa por aquí, para que un mismo
 * proceso pueda servir varias tiendas sin mezclarlas.
 */
export interface InstanceConfig {
  /** Prefijo de las claves del navegador y de las carpetas de medios. */
  slug: string;
  /** URL pública sin barra final: canonical, OG, sitemap, callback de Bold. */
  siteUrl: string;
  /** null: repositorios en memoria (desarrollo y tests). */
  db: { uri: string; name: string } | null;
  orderPrefix: string;
  /** Firma la sesión del panel y cifra la llave de Bold; null: panel no configurado. */
  adminSecret: string | null;
  /** Contraseña inicial del panel (solo modo single: en multi la pone Kode en la base). */
  adminPassword: string | null;
  whatsappNumber: string | undefined;
  tracking: TrackingIds;
  media: { dir: string; cloudinary: boolean; folders: { site: string; catalogUploads: string } };
  /** Solo en el demo host. */
  demo: { expiresAt: Date; banner: boolean; mediaQuotaMb: number } | null;
}

/** El entorno como mapa simple (también en tests). */
export type Env = Record<string, string | undefined>;

export type Tenancy = "single" | "multi";

export function tenancy(env: Env = process.env): Tenancy {
  return env.TENANCY === "multi" ? "multi" : "single";
}

const validSlug = (s: string | undefined) => (s && STORE_SLUG.test(s) ? s : "tienda");

/** Prefijo de pedido: 1–4 letras explícitas o las iniciales del slug ("aurora-joyeria" → "AJ"). */
export function prefixFor(slug: string, explicit?: string): string {
  const env = explicit?.trim().toUpperCase() ?? "";
  if (/^[A-Z]{1,4}$/.test(env)) return env;
  return slug
    .split("-")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

const folders = (slug: string) => ({ site: `${slug}/sitio`, catalogUploads: `${slug}/catalogo/subidas` });

/** Prefijo de Cloudinary de una demo: lo ÚNICO que se borra al borrarla (con la barra final). */
export const demoMediaPrefix = (slug: string) => {
  if (!STORE_SLUG.test(slug)) throw new Error(`Slug no válido: ${slug}`);
  return `demos/${slug}/`;
};
const demoFolders = (slug: string) => ({ site: `${demoMediaPrefix(slug)}sitio`, catalogUploads: `${demoMediaPrefix(slug)}catalogo` });

/** Modo single: una tienda por proceso, todo del entorno (como siempre). */
export function singleInstanceConfig(env: Env = process.env): InstanceConfig {
  const slug = validSlug(env.STORE_SLUG?.trim());
  const secret = env.ADMIN_SECRET ?? "";
  const uri = env.MONGODB_URI?.trim();
  return {
    slug,
    siteUrl: (env.SITE_URL || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
    db: uri ? { uri, name: requiredDbName(env) } : null,
    orderPrefix: prefixFor(slug, env.STORE_ORDER_PREFIX),
    adminSecret: secret.length >= 32 ? secret : null,
    adminPassword: env.ADMIN_PASSWORD || null,
    whatsappNumber: env.WHATSAPP_NUMBER || env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined,
    tracking: trackingIds({ ga: env.GA_MEASUREMENT_ID, pixel: env.META_PIXEL_ID }),
    media: { dir: env.MEDIA_DIR || join(process.cwd(), ".data", "uploads"), cloudinary: Boolean(env.CLOUDINARY_URL), folders: folders(slug) },
    demo: null,
  };
}

function requiredDbName(env: Env): string {
  const name = env.MONGODB_DB?.trim();
  if (!name) throw new Error("Falta MONGODB_DB: con MONGODB_URI hay que indicar la base de la instancia.");
  return name;
}

/** Lo que el demo host sabe de cada tenant (registro `demo_registry.tenants`). */
export interface TenantRecord {
  slug: string;
  hosts: string[];
  niche: string;
  whatsappNumber: string | null;
  expiresAt: Date;
  banner: boolean;
  mediaQuotaMb: number;
}

/** Base de un tenant: `demo_<slug con _>` (los guiones no van en nombres de base por convención de Kode). */
export const tenantDbName = (slug: string) => `demo_${slug.replace(/-/g, "_")}`;

/**
 * Clave por tenant derivada del maestro (HKDF-SHA256, info = slug): una cookie
 * de sesión de una demo no sirve en otra, y nada por tenant hay que guardar.
 */
export function tenantSecret(master: string, slug: string): string {
  return Buffer.from(hkdfSync("sha256", master, "jewelry-store/demo-host", `tenant:${slug}`, 32)).toString("base64url");
}

/** Modo multi: la tienda de un tenant del demo host. Sin Cloudinary, sin tracking, con prefijo DEMO. */
export function tenantInstanceConfig(t: TenantRecord, env: Env = process.env): InstanceConfig {
  const uri = env.MONGODB_URI?.trim();
  const master = env.DEMO_MASTER_SECRET ?? "";
  if (!uri) throw new Error("El demo host necesita MONGODB_URI.");
  if (master.length < 32) throw new Error("El demo host necesita DEMO_MASTER_SECRET (32+ caracteres).");
  if (!env.CLOUDINARY_URL && !env.MEDIA_DIR) throw new Error("El demo host necesita CLOUDINARY_URL (o MEDIA_DIR en desarrollo).");
  return {
    slug: t.slug,
    siteUrl: `https://${t.hosts[0]}`,
    db: { uri, name: tenantDbName(t.slug) },
    orderPrefix: "DEMO",
    adminSecret: tenantSecret(master, t.slug),
    adminPassword: null,
    whatsappNumber: t.whatsappNumber ?? undefined,
    tracking: { gaId: null, pixelId: null },
    // Un deploy del hosting borra el disco del sitio: las demos guardan en Cloudinary,
    // siempre bajo `demos/<slug>/` (la cuenta es compartida). MEDIA_DIR solo para desarrollo.
    media: { dir: join(env.MEDIA_DIR || "/data/media", t.slug), cloudinary: Boolean(env.CLOUDINARY_URL), folders: demoFolders(t.slug) },
    demo: { expiresAt: t.expiresAt, banner: t.banner, mediaQuotaMb: t.mediaQuotaMb },
  };
}

/** Huella corta y estable de un objeto (para detectar cambios de configuración). */
export const fingerprint = (value: unknown) => createHmac("sha256", "fp").update(JSON.stringify(value)).digest("hex").slice(0, 16);
