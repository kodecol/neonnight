import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createContainer, getContainer, type Container } from "@/infrastructure/container";
import { tenancy, type InstanceConfig } from "@/infrastructure/config/instance";
import { demoHost } from "@/infrastructure/tenancy/demo-host";
import { InMemoryProductRepository } from "@/infrastructure/repositories/in-memory-product-repository";
import { InMemoryLineRepository } from "@/infrastructure/repositories/in-memory-line-repository";
import { InMemoryCategoryRepository } from "@/infrastructure/repositories/in-memory-category-repository";
import { InMemoryBrandRepository } from "@/infrastructure/repositories/in-memory-brand-repository";

/**
 * El contenedor de la tienda de ESTA petición. En modo single es el de
 * siempre (uno por proceso). En el demo host sale del host: lo usan las
 * páginas, las server actions (que no pasan por el middleware) y los route
 * handlers, así que ninguna entrada puede leer datos de otro tenant.
 * Host desconocido o demo caducada: 404.
 */
export async function container(): Promise<Container> {
  const r = await requestContainer();
  if (r.state !== "ok") notFound();
  return r.container;
}

/** Igual que `container()` para route handlers: null si el host no es de una demo activa. */
export async function containerFor(req: Request): Promise<Container | null> {
  if (tenancy() === "single") return getContainer();
  const r = await demoHost().resolve(req.headers.get("host"));
  return r.kind === "ok" ? r.container : null;
}

/**
 * Para lo que se pinta SIEMPRE (layout raíz y páginas 404): nunca lanza. Con
 * un host que no es de una demo activa da un contenedor neutro, sin base ni
 * datos de nadie, para mostrar un 404 (o "esta demo terminó") sin bucles.
 */
export async function requestContainer(): Promise<{ state: "ok" | "not-found" | "expired"; container: Container }> {
  if (tenancy() === "single") return { state: "ok", container: getContainer() };
  const r = await demoHost().resolve((await headers()).get("host"));
  if (r.kind === "ok") return { state: "ok", container: r.container };
  return { state: r.kind, container: neutralContainer() };
}

const g = globalThis as unknown as { __nnNeutral?: Container };

function neutralContainer(): Container {
  const zone = process.env.DEMO_ZONE?.trim() || "localhost";
  const config: InstanceConfig = {
    slug: "demo",
    siteUrl: `https://${zone}`,
    db: null,
    orderPrefix: "DEMO",
    adminSecret: null,
    adminPassword: null,
    whatsappNumber: undefined,
    tracking: { gaId: null, pixelId: null },
    media: { dir: "/nonexistent", cloudinary: false, folders: { site: "demos/_", catalogUploads: "demos/_" } },
    demo: { expiresAt: new Date(0), banner: false, mediaQuotaMb: 0 },
  };
  // Sin catálogo: el contenedor neutro solo pinta el 404 (nada del seed de ninguna tienda).
  return (g.__nnNeutral ??= createContainer(
    { products: new InMemoryProductRepository([]), lines: new InMemoryLineRepository([]), categories: new InMemoryCategoryRepository([]), brands: new InMemoryBrandRepository([]) },
    config,
  ));
}

/** URL pública de la tienda de esta petición (canonical, OG, JSON-LD, sitemap). */
export async function siteBaseUrl(): Promise<string> {
  return (await requestContainer()).container.config.siteUrl;
}
