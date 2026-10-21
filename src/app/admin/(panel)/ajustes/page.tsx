import { redirect } from "next/navigation";
import { SETTINGS_TABS } from "@/presentation/components/admin/admin-nav";

export default function SettingsIndex() {
  redirect(SETTINGS_TABS[0]!.href);
}
