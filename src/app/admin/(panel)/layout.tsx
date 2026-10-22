import { AdminShell } from "@/presentation/components/admin/AdminShell";
import { requireAdmin } from "../_lib/auth";
import { logoutAction } from "../_lib/session-actions";
import { container } from "@/app/_lib/tenant";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { brand } = await (await container()).content.get();
  return (
    <AdminShell wordmark={brand.wordmark} isotype={brand.isotype} logout={logoutAction}>
      {children}
    </AdminShell>
  );
}
