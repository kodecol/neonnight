import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { GetAdminWatch } from "@/application/use-cases/admin/get-admin-watch";
import { WatchForm } from "@/presentation/components/admin/WatchForm";
import { ROUTES } from "@/presentation/lib/site";
import { deleteWatchAction, saveWatchAction, uploadImageAction } from "../actions";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const w = await new GetAdminWatch(getContainer().watches).execute(id);
  return { title: w ? `${w.brand} ${w.model}` : "Reloj" };
}

export default async function EditWatchPage({ params, searchParams }: { params: Params; searchParams: Promise<{ creado?: string }> }) {
  const { id } = await params;
  const { creado } = await searchParams;
  const { watches, categories } = getContainer();
  const [watch, cats, entity] = await Promise.all([new GetAdminWatch(watches).execute(id), categories.list(), watches.findById(id)]);
  if (!watch) notFound();
  return (
    <WatchForm
      key={watch.id}
      initial={watch}
      categories={cats}
      save={saveWatchAction}
      remove={deleteWatchAction}
      upload={uploadImageAction}
      storeHref={ROUTES.watch(watch.slug)}
      updatedAt={entity?.updatedAt.toISOString()}
      justCreated={creado === "1"}
    />
  );
}
