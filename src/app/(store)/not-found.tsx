import type { Metadata } from "next";
import { connection } from "next/server";
import { NotFoundView } from "@/presentation/components/blocks/NotFoundView";
import { container } from "@/app/_lib/tenant";

/**
 * Next ya agrega `<meta name="robots" content="noindex">` a todo 404: aquí el
 * `robots` va sin index/follow (no emite un segundo `robots` con el
 * "index, follow" del layout) y solo fija el de Google.
 */
export const metadata: Metadata = { title: "Página no encontrada", robots: { googleBot: { index: false, follow: true } } };

export default async function NotFound() {
  await connection();
  const { brand } = await (await container()).content.get();
  return <NotFoundView brand={brand} />;
}
