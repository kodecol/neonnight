import { connection } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { NotFoundView } from "@/presentation/components/blocks/NotFoundView";

/** 404 fuera de la tienda: se pinta en cada petición para tomar la identidad vigente. */
export default async function NotFound() {
  await connection();
  const { brand } = await getContainer().content.get();
  return <NotFoundView brand={brand} standalone />;
}
