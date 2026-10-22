import type { Metadata } from "next";
import { connection } from "next/server";
import { NotFoundView } from "@/presentation/components/blocks/NotFoundView";
import { requestContainer } from "@/app/_lib/tenant";

/**
 * Next ya agrega `<meta name="robots" content="noindex">` a todo 404: aquí el
 * `robots` va sin index/follow (no emite un segundo `robots` con el
 * "index, follow" del layout) y solo fija el de Google.
 */
export const metadata: Metadata = { title: "Página no encontrada", robots: { googleBot: { index: false, follow: true } } };

/** 404 fuera de la tienda: se pinta en cada petición para tomar la identidad vigente. */
export default async function NotFound() {
  await connection();
  const { state, container } = await requestContainer();
  const { brand } = await container.content.get();
  // Demo vencida: el host existe, pero la demo ya no se sirve.
  return <NotFoundView brand={brand} standalone ended={state === "expired"} />;
}
