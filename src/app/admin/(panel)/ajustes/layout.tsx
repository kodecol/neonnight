import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { SettingsTabs } from "@/presentation/components/admin/SettingsTabs";

/** Ajustes: lo que se configura una vez (pagos, seguridad, identidad…), en pestañas. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminPageHeader kicker="Configuración" title="Ajustes" />
      <SettingsTabs />
      {children}
    </>
  );
}
