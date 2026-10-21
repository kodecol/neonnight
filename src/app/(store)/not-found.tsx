import { connection } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { NotFoundView } from "@/presentation/components/blocks/NotFoundView";

export default async function NotFound() {
  await connection();
  const { brand } = await getContainer().content.get();
  return <NotFoundView brand={brand} />;
}
