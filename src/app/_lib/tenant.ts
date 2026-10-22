import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getContainer, type Container } from "@/infrastructure/container";
import { tenancy } from "@/infrastructure/config/instance";
import { demoHost } from "@/infrastructure/tenancy/demo-host";

/**
 * El contenedor de la tienda de ESTA petición. En modo single es el de
 * siempre (uno por proceso). En el demo host sale del host: lo usan las
 * páginas, las server actions (que no pasan por el middleware) y los route
 * handlers, así que ninguna entrada puede leer datos de otro tenant.
 * Host desconocido o demo caducada: 404 (el middleware ya responde 410 a las
 * páginas de una demo caducada; esto cubre lo que no pasa por él).
 */
export async function container(): Promise<Container> {
  if (tenancy() === "single") return getContainer();
  const r = await demoHost().resolve((await headers()).get("host"));
  if (r.kind !== "ok") notFound();
  return r.container;
}

/** Igual que `container()` para route handlers: null si el host no es de una demo activa. */
export async function containerFor(req: Request): Promise<Container | null> {
  if (tenancy() === "single") return getContainer();
  const r = await demoHost().resolve(req.headers.get("host"));
  return r.kind === "ok" ? r.container : null;
}

/** URL pública de la tienda de esta petición (canonical, OG, JSON-LD, sitemap). */
export async function siteBaseUrl(): Promise<string> {
  return (await container()).config.siteUrl;
}
