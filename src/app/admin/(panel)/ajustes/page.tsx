import { redirect } from "next/navigation";
import { SETTINGS_TABS } from "@/presentation/components/admin/admin-nav";
import { requireAdmin } from "../../_lib/auth";

export default async function SettingsIndex() {
  await requireAdmin(); // el layout no basta: una petición RSC puede renderizar solo esta página
  redirect(SETTINGS_TABS[0]!.href);
}
