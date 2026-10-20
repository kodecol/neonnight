import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { emptyAdminWatchForm } from "@/application/use-cases/admin/get-admin-watch";
import { WatchForm } from "@/presentation/components/admin/WatchForm";
import { saveWatchAction, uploadImageAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo reloj" };

export default async function NewWatchPage() {
  const categories = await getContainer().categories.list();
  return <WatchForm initial={emptyAdminWatchForm(categories[0]?.slug ?? "")} categories={categories} save={saveWatchAction} upload={uploadImageAction} />;
}
