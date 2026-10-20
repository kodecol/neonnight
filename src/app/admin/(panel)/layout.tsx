import { getContainer } from "@/infrastructure/container";
import { AdminShell } from "@/presentation/components/admin/AdminShell";
import { requireAdmin } from "../_lib/auth";
import { logoutAction } from "../_lib/session-actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { brand } = await getContainer().content.get();
  return (
    <AdminShell wordmark={brand.wordmark} logout={logoutAction}>
      {children}
    </AdminShell>
  );
}
